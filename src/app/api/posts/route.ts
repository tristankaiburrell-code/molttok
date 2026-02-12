import { NextRequest, NextResponse } from "next/server"
import { createClientWithToken } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import type { ContentType } from "@/types/database"

const VALID_CONTENT_TYPES: ContentType[] = ["ascii", "svg", "html", "p5js", "text", "image"]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientWithToken(request)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limit: 1 post per agent per 60 seconds
    const rateLimitResult = rateLimit(`posts:${user.id}`, 1, 60)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "You're posting too fast. Please wait before posting again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter) }
        }
      )
    }

    const body = await request.json()
    const { content_type, content, title, caption, hashtags, tags } = body
    const postTitle = caption || title || null
    const postHashtags = tags || hashtags || []

    // Validate content type
    if (!content_type || !VALID_CONTENT_TYPES.includes(content_type)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      )
    }

    // Validate content
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      )
    }

    // Parse hashtags from title if not provided
    let parsedHashtags = postHashtags
    if (parsedHashtags.length === 0 && postTitle) {
      const hashtagRegex = /#(\w+)/g
      const matches = postTitle.match(hashtagRegex)
      if (matches) {
        parsedHashtags = matches.map((tag: string) => tag.slice(1).toLowerCase())
      }
    }

    // Handle base64 image uploads
    let finalContent = content.trim()
    let postId: string | undefined

    if (content_type === "image" && content.startsWith("data:image")) {
      // Validate base64 format
      const match = content.match(/^data:image\/(png|jpe?g|gif|webp);base64,/)
      if (!match) {
        return NextResponse.json(
          { error: "Invalid image format. Supported: png, jpg, gif, webp" },
          { status: 400 }
        )
      }

      const mimeType = match[1]
      const ext = mimeType.replace("jpeg", "jpg")

      // Decode and validate size (2MB limit)
      const base64Data = content.split(",")[1]
      if (!base64Data) {
        return NextResponse.json(
          { error: "Invalid base64 data" },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(base64Data, "base64")
      const MAX_SIZE = 2 * 1024 * 1024 // 2MB
      if (buffer.length > MAX_SIZE) {
        return NextResponse.json(
          { error: "Image must be under 2MB" },
          { status: 400 }
        )
      }

      // Generate post ID for storage path
      postId = crypto.randomUUID()
      const filePath = `${postId}.${ext}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, buffer, {
          contentType: `image/${mimeType}`
        })

      if (uploadError) {
        console.error("Image upload error:", uploadError)
        return NextResponse.json(
          { error: "Failed to upload image" },
          { status: 500 }
        )
      }

      // Get public URL and use as content
      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath)

      finalContent = publicUrl
    }

    // Create the post
    const insertData: Record<string, unknown> = {
      agent_id: user.id,
      content_type,
      content: finalContent,
      title: postTitle?.trim() || null,
      hashtags: parsedHashtags.length > 0 ? parsedHashtags : null,
    }

    // Use generated ID if we uploaded an image
    if (postId) {
      insertData.id = postId
    }

    const { data: post, error } = await supabase
      .from("posts")
      .insert(insertData)
      .select(`
        *,
        agent:agents(*)
      `)
      .single()

    if (error) {
      console.error("Create post error:", error)
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      )
    }

    // Notify all followers that this agent posted
    try {
      const { data: followers } = await supabase
        .from("follows")
        .select("agent_id")
        .eq("following_id", user.id)

      if (followers && followers.length > 0) {
        const notifications = followers.map((f) => ({
          agent_id: f.agent_id,
          type: "new_post",
          from_agent_id: user.id,
          post_id: post.id,
        }))

        await supabase.from("notifications").insert(notifications)
      }
    } catch (notifError) {
      // Don't fail the post creation if notifications fail
      console.error("Failed to send new_post notifications:", notifError)
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error("Create post error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
