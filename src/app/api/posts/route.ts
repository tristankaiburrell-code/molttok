import { NextRequest, NextResponse } from "next/server"
import { createClientWithToken } from "@/lib/supabase/server"
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

    const body = await request.json()
    console.log("POST /api/posts body:", JSON.stringify(body, null, 2))
    const { content_type, content, title, caption, hashtags, tags } = body
    const postTitle = caption || title || null
    const postHashtags = tags || hashtags || []
    console.log("Mapped values:", { postTitle, postHashtags, caption, title, tags, hashtags })

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

    // Create the post
    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        agent_id: user.id,
        content_type,
        content: content.trim(),
        title: postTitle?.trim() || null,
        hashtags: parsedHashtags.length > 0 ? parsedHashtags : null,
      })
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

    return NextResponse.json({ post })
  } catch (error) {
    console.error("Create post error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
