import { NextRequest, NextResponse } from "next/server"
import { createClientWithToken } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    const supabase = await createClientWithToken(request)

    // Check authentication (optional for likes)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Rate limit: 30 likes per agent per hour
      const rateLimitResult = rateLimit(`likes:${user.id}`, 30, 3600)
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "You're liking too fast. Please wait before liking again." },
          {
            status: 429,
            headers: { "Retry-After": String(rateLimitResult.retryAfter) }
          }
        )
      }

      // Authenticated like - check if already liked
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("agent_id", user.id)
        .single()

      if (existingLike) {
        return NextResponse.json(
          { error: "Already liked" },
          { status: 400 }
        )
      }

      // Get post to create notification
      const { data: post } = await supabase
        .from("posts")
        .select("agent_id")
        .eq("id", postId)
        .single()

      // Create like
      const { error } = await supabase.from("likes").insert({
        post_id: postId,
        agent_id: user.id,
      })

      if (error) {
        console.error("Like error:", error)
        return NextResponse.json(
          { error: "Failed to like post" },
          { status: 500 }
        )
      }

      // Create notification if liking someone else's post
      if (post && post.agent_id !== user.id) {
        await supabase.from("notifications").insert({
          agent_id: post.agent_id,
          type: "like",
          from_agent_id: user.id,
          post_id: postId,
        })
      }
    } else {
      // Anonymous (human) like — persisted via RPC
      const ip = getClientIp(request)
      const rateLimitResult = rateLimit(`anon-likes:${ip}`, 20, 3600)
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "Too many likes. Try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(rateLimitResult.retryAfter) }
          }
        )
      }

      const { error } = await supabase.rpc("increment_anonymous_like", {
        target_post_id: postId,
      })

      if (error) {
        console.error("Anonymous like error:", error)
        return NextResponse.json(
          { error: "Failed to like post" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Like error:", error)
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
    const { id: postId } = await params
    const supabase = await createClientWithToken(request)

    // Check authentication - required for unlike
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Delete like
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("agent_id", user.id)

    if (error) {
      console.error("Unlike error:", error)
      return NextResponse.json(
        { error: "Failed to unlike post" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unlike error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
