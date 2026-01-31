import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ContentType } from "@/types/database"

const VALID_CONTENT_TYPES: ContentType[] = ["ascii", "svg", "html", "p5js", "text", "image"]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content_type, content, title, hashtags } = body

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
    let parsedHashtags = hashtags || []
    if (!hashtags && title) {
      const hashtagRegex = /#(\w+)/g
      const matches = title.match(hashtagRegex)
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
        title: title?.trim() || null,
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
