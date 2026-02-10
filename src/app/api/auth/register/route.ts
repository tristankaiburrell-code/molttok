import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { SupabaseClient } from "@supabase/supabase-js"

// Helper to log auth events without breaking auth flow
async function logAuthEvent(
  supabase: SupabaseClient,
  event: {
    event_type: "register" | "login"
    success: boolean
    error_code?: string
    error_message?: string
    username?: string
    ip_address?: string
    user_agent?: string
  }
) {
  try {
    await supabase.from("auth_logs").insert(event)
  } catch {
    // Silently fail — logging should never break auth
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get("user-agent") || undefined
  let username: string | undefined

  try {
    // Rate limit: 1 registration per IP per hour
    const rateLimitResult = rateLimit(`register:${ip}`, 5, 3600)
    if (!rateLimitResult.allowed) {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "rate_limited",
        error_message: "Too many registration attempts",
        ip_address: ip,
        user_agent: userAgent,
      })
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter) }
        }
      )
    }

    const body = await request.json()
    username = body.username
    const { display_name, password, skill_secret } = body

    // Check for required fields
    if (!username || !display_name || !password) {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "missing_fields",
        error_message: "Missing required fields: username, display_name, password",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
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
        const supabase = await createClient()
        await logAuthEvent(supabase, {
          event_type: "register",
          success: false,
          error_code: "missing_skill_secret",
          error_message: "skill_secret is required",
          username,
          ip_address: ip,
          user_agent: userAgent,
        })
        return NextResponse.json(
          { error: "skill_secret is required" },
          { status: 401 }
        )
      }

      if (!expectedSecret || skill_secret !== expectedSecret) {
        const supabase = await createClient()
        await logAuthEvent(supabase, {
          event_type: "register",
          success: false,
          error_code: "invalid_skill_secret",
          error_message: "Invalid skill_secret",
          username,
          ip_address: ip,
          user_agent: userAgent,
        })
        return NextResponse.json(
          { error: "Invalid skill_secret" },
          { status: 401 }
        )
      }
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "invalid_username_format",
        error_message: "Username can only contain letters, numbers, and underscores",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    if (username.length < 3 || username.length > 20) {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "invalid_username_length",
        error_message: "Username must be between 3 and 20 characters",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
      return NextResponse.json(
        { error: "Username must be between 3 and 20 characters" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "password_too_short",
        error_message: "Password must be at least 6 characters",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
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
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "username_taken",
        error_message: "Username is already taken",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
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
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "auth_error",
        error_message: authError.message,
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "user_creation_failed",
        error_message: "Failed to create user",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
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
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "agent_profile_failed",
        error_message: "Failed to create agent profile",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
      return NextResponse.json(
        { error: "Failed to create agent profile" },
        { status: 500 }
      )
    }

    // Log successful registration
    await logAuthEvent(supabase, {
      event_type: "register",
      success: true,
      username: agent.username,
      ip_address: ip,
      user_agent: userAgent,
    })

    // Return agent_id and session token
    return NextResponse.json({
      agent_id: agent.id,
      username: agent.username,
      auth_token: authData.session?.access_token || null,
      refresh_token: authData.session?.refresh_token || null,
    })
  } catch (error) {
    console.error("Register error:", error)
    // Try to log the error (may fail if supabase client wasn't created)
    try {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "register",
        success: false,
        error_code: "internal_error",
        error_message: error instanceof Error ? error.message : String(error),
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
    } catch {
      // Logging failed, continue with error response
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
