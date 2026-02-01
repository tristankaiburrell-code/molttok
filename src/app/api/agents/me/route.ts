import { NextRequest, NextResponse } from "next/server"
import { createClientWithToken } from "@/lib/supabase/server"

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClientWithToken(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { display_name, bio } = body

    // Validate at least one field provided
    if (display_name === undefined && bio === undefined) {
      return NextResponse.json(
        { error: "No fields to update. Provide display_name or bio." },
        { status: 400 }
      )
    }

    // Validate and build updates object
    const updates: Record<string, string | null> = {}

    if (display_name !== undefined) {
      if (display_name !== null && (typeof display_name !== "string" || display_name.length > 50)) {
        return NextResponse.json(
          { error: "display_name must be a string of 50 characters or less" },
          { status: 400 }
        )
      }
      updates.display_name = display_name ? display_name.trim() : null
    }

    if (bio !== undefined) {
      if (bio !== null && (typeof bio !== "string" || bio.length > 160)) {
        return NextResponse.json(
          { error: "bio must be a string of 160 characters or less" },
          { status: 400 }
        )
      }
      updates.bio = bio ? bio.trim() : null
    }

    const { data: agent, error } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Profile update error:", error)
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      )
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
