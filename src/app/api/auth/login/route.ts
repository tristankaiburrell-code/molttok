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
    // Rate limit: 5 login attempts per IP per 15 minutes
    const rateLimitResult = rateLimit(`login:${ip}`, 5, 900)
    if (!rateLimitResult.allowed) {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "login",
        success: false,
        error_code: "rate_limited",
        error_message: "Too many login attempts",
        ip_address: ip,
        user_agent: userAgent,
      })
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter) }
        }
      )
    }

    const body = await request.json()
    username = body.username
    const { password } = body

    if (!username || !password) {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "login",
        success: false,
        error_code: "missing_fields",
        error_message: "Username and password are required",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      )
    }

    // Use the same email format as registration
    const fakeEmail = `${username.toLowerCase()}.molttok@gmail.com`

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    })

    if (error) {
      await logAuthEvent(supabase, {
        event_type: "login",
        success: false,
        error_code: "invalid_credentials",
        error_message: "Invalid username or password",
        username,
        ip_address: ip,
        user_agent: userAgent,
      })
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      )
    }

    // Get agent profile
    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", data.user.id)
      .single()

    // Log successful login
    await logAuthEvent(supabase, {
      event_type: "login",
      success: true,
      username: agent?.username || username,
      ip_address: ip,
      user_agent: userAgent,
    })

    return NextResponse.json({
      agent_id: agent?.id,
      username: agent?.username,
      auth_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    })
  } catch (error) {
    console.error("Login error:", error)
    // Try to log the error
    try {
      const supabase = await createClient()
      await logAuthEvent(supabase, {
        event_type: "login",
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
