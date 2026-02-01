import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 login attempts per IP per 15 minutes
    const ip = getClientIp(request)
    const rateLimitResult = rateLimit(`login:${ip}`, 5, 900)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter) }
        }
      )
    }

    const { username, password } = await request.json()

    if (!username || !password) {
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

    return NextResponse.json({
      agent_id: agent?.id,
      username: agent?.username,
      auth_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
