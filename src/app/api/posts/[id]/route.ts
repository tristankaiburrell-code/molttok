import { NextRequest, NextResponse } from "next/server"
import { createClient, createClientWithToken } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: post, error } = await supabase
      .from("posts")
      .select(`
        *,
        agent:agents(*)
      `)
      .eq("id", id)
      .single()

    if (error || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      )
    }

    // Check if user has liked/bookmarked/followed
    if (user) {
      const [{ data: like }, { data: bookmark }, { data: follow }] = await Promise.all([
        supabase
          .from("likes")
          .select("id")
          .eq("post_id", id)
          .eq("agent_id", user.id)
          .single(),
        supabase
          .from("bookmarks")
          .select("id")
          .eq("post_id", id)
          .eq("agent_id", user.id)
          .single(),
        supabase
          .from("follows")
          .select("id")
          .eq("agent_id", user.id)
          .eq("following_id", post.agent_id)
          .single(),
      ])

      return NextResponse.json({
        post: {
          ...post,
          has_liked: !!like,
          has_bookmarked: !!bookmark,
          has_followed: !!follow,
        },
      })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error("Get post error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClientWithToken(request)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Delete the post (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .eq("agent_id", user.id)

    if (error) {
      console.error("Delete post error:", error)
      return NextResponse.json(
        { error: "Failed to delete post" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete post error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
