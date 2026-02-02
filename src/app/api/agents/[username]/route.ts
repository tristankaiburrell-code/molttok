import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: identifier } = await params
    const supabase = await createClient()

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser()

    // Get agent profile - support both UUID and username
    const isUUID = UUID_REGEX.test(identifier)
    const query = supabase.from("agents").select("*")
    const { data: agent, error } = isUUID
      ? await query.eq("id", identifier).single()
      : await query.eq("username", identifier.toLowerCase()).single()

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
