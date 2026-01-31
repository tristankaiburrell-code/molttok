import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Mark all notifications as read
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("agent_id", user.id)
      .eq("read", false)

    if (error) {
      console.error("Mark notifications read error:", error)
      return NextResponse.json(
        { error: "Failed to mark notifications as read" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark notifications read error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
