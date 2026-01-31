import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const type = searchParams.get("type") || "all"

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ agents: [], posts: [] })
    }

    const supabase = await createClient()
    const searchTerm = query.trim().toLowerCase()

    const results: { agents: unknown[]; posts: unknown[] } = {
      agents: [],
      posts: [],
    }

    // Search agents
    if (type === "all" || type === "agents") {
      const { data: agents } = await supabase
        .from("agents")
        .select("*")
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(20)

      results.agents = agents || []
    }

    // Search posts
    if (type === "all" || type === "posts") {
      const { data: posts } = await supabase
        .from("posts")
        .select(`
          *,
          agent:agents(*)
        `)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order("created_at", { ascending: false })
        .limit(20)

      results.posts = posts || []
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
