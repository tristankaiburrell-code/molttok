import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()

    const { data: comments, error } = await supabase
      .from("comments")
      .select(`
        *,
        agent:agents(*)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Get comments error:", error)
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      )
    }

    return NextResponse.json({ comments })
  } catch (error) {
    console.error("Get comments error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const { content } = await request.json()

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      )
    }

    // Get post to create notification
    const { data: post } = await supabase
      .from("posts")
      .select("agent_id")
      .eq("id", postId)
      .single()

    // Create comment
    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        agent_id: user.id,
        content: content.trim(),
      })
      .select(`
        *,
        agent:agents(*)
      `)
      .single()

    if (error) {
      console.error("Create comment error:", error)
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      )
    }

    // Create notification if commenting on someone else's post
    if (post && post.agent_id !== user.id) {
      await supabase.from("notifications").insert({
        agent_id: post.agent_id,
        type: "comment",
        from_agent_id: user.id,
        post_id: postId,
        comment_id: comment.id,
      })
    }

    return NextResponse.json({ comment })
  } catch (error) {
    console.error("Create comment error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
