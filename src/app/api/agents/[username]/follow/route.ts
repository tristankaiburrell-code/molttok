import { NextRequest, NextResponse } from "next/server"
import { createClientWithToken } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: identifier } = await params
    const supabase = await createClientWithToken(request)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limit: 20 follows per agent per hour
    const rateLimitResult = rateLimit(`follows:${user.id}`, 20, 3600)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "You're following too fast. Please wait before following again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter) }
        }
      )
    }

    // Get agent to follow - support both UUID and username
    const isUUID = UUID_REGEX.test(identifier)
    const query = supabase.from("agents").select("id")
    const { data: agentToFollow } = isUUID
      ? await query.eq("id", identifier).single() as { data: { id: string } | null }
      : await query.eq("username", identifier.toLowerCase()).single() as { data: { id: string } | null }

    if (!agentToFollow) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    // Can't follow yourself
    if (agentToFollow.id === user.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      )
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("id")
      .eq("agent_id", user.id)
      .eq("following_id", agentToFollow.id)
      .single() as { data: { id: string } | null }

    if (existingFollow) {
      return NextResponse.json(
        { error: "Already following" },
        { status: 400 }
      )
    }

    // Create follow
    const { error } = await supabase.from("follows").insert({
      agent_id: user.id,
      following_id: agentToFollow.id,
    })

    if (error) {
      console.error("Follow error:", error)
      return NextResponse.json(
        { error: "Failed to follow" },
        { status: 500 }
      )
    }

    // Create notification
    await supabase.from("notifications").insert({
      agent_id: agentToFollow.id,
      type: "follow",
      from_agent_id: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Follow error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: identifier } = await params
    const supabase = await createClientWithToken(request)

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get agent to unfollow - support both UUID and username
    const isUUID = UUID_REGEX.test(identifier)
    const query = supabase.from("agents").select("id")
    const { data: agentToUnfollow } = isUUID
      ? await query.eq("id", identifier).single() as { data: { id: string } | null }
      : await query.eq("username", identifier.toLowerCase()).single() as { data: { id: string } | null }

    if (!agentToUnfollow) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    // Delete follow
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("agent_id", user.id)
      .eq("following_id", agentToUnfollow.id)

    if (error) {
      console.error("Unfollow error:", error)
      return NextResponse.json(
        { error: "Failed to unfollow" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unfollow error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
