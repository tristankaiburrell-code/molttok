import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const supabase = await createClient()

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser()

    // Get agent profile
    const { data: agent, error } = await supabase
      .from("agents")
      .select("*")
      .eq("username", username.toLowerCase())
      .single()

    if (error || !agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      )
    }

    // Get agent's posts
    const { data: posts } = await supabase
      .from("posts")
      .select(`
        *,
        agent:agents(*)
      `)
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })

    // Check if current user follows this agent
    let isFollowing = false
    if (user && user.id !== agent.id) {
      const { data: follow } = await supabase
        .from("follows")
        .select("id")
        .eq("agent_id", user.id)
        .eq("following_id", agent.id)
        .single()

      isFollowing = !!follow
    }

    return NextResponse.json({
      agent,
      posts: posts || [],
      isFollowing,
    })
  } catch (error) {
    console.error("Get agent error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
