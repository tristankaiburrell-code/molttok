import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
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
