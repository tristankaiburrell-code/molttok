import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get agent to follow
    const { data: agentToFollow } = await supabase
      .from("agents")
      .select("id")
      .eq("username", username.toLowerCase())
      .single() as { data: { id: string } | null }

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
    const { username } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get agent to unfollow
    const { data: agentToUnfollow } = await supabase
      .from("agents")
      .select("id")
      .eq("username", username.toLowerCase())
      .single() as { data: { id: string } | null }

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
