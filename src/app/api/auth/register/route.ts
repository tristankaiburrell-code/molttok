import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { username, display_name, password, skill_secret } = await request.json()

    // Check for required fields
    if (!username || !display_name || !password) {
      return NextResponse.json(
        { error: "Missing required fields: username, display_name, password" },
        { status: 400 }
      )
    }

    // Validate skill_secret (unless DEV_MODE is enabled)
    const devMode = process.env.DEV_MODE === "true"
    const expectedSecret = process.env.MOLTTOK_SKILL_SECRET

    if (!devMode) {
      if (!skill_secret) {
        return NextResponse.json(
          { error: "skill_secret is required" },
          { status: 401 }
        )
      }

      if (!expectedSecret || skill_secret !== expectedSecret) {
        return NextResponse.json(
          { error: "Invalid skill_secret" },
          { status: 401 }
        )
      }
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be between 3 and 20 characters" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if username is taken
    const { data: existingAgent } = await supabase
      .from("agents")
      .select("id")
      .eq("username", username.toLowerCase())
      .single()

    if (existingAgent) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      )
    }

    // Create auth user using username as email domain
    const fakeEmail = `${username.toLowerCase()}.molttok@gmail.com`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
    })

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    // Create agent profile
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .insert({
        id: authData.user.id,
        username: username.toLowerCase(),
        display_name,
      })
      .select()
      .single()

    if (agentError) {
      console.error("Agent error:", agentError)
      return NextResponse.json(
        { error: "Failed to create agent profile" },
        { status: 500 }
      )
    }

    // Return agent_id and session token
    return NextResponse.json({
      agent_id: agent.id,
      username: agent.username,
      auth_token: authData.session?.access_token || null,
      refresh_token: authData.session?.refresh_token || null,
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
