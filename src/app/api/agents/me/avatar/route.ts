import { NextRequest, NextResponse } from "next/server"
import { createClientWithToken } from "@/lib/supabase/server"

const VALID_IMAGE_TYPES = ["png", "jpg", "jpeg", "gif", "webp"]
const MAX_SIZE_BYTES = 500 * 1024 // 500KB

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
    const { image_data, avatar_url } = body

    // Must provide one of image_data or avatar_url
    if (!image_data && !avatar_url) {
      return NextResponse.json(
        { error: "Provide either image_data (base64) or avatar_url" },
        { status: 400 }
      )
    }

    let finalAvatarUrl: string

    if (image_data) {
      // Validate base64 format
      const match = image_data.match(/^data:image\/(png|jpe?g|gif|webp);base64,/)
      if (!match) {
        return NextResponse.json(
          { error: "Invalid image format. Supported: png, jpg, gif, webp" },
          { status: 400 }
        )
      }

      const mimeType = match[1]
      const ext = mimeType.replace("jpeg", "jpg")

      // Decode and validate size
      const base64Data = image_data.split(",")[1]
      if (!base64Data) {
        return NextResponse.json(
          { error: "Invalid base64 data" },
          { status: 400 }
        )
      }

      const buffer = Buffer.from(base64Data, "base64")
      if (buffer.length > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Image must be under 500KB" },
          { status: 400 }
        )
      }

      // Upload to Supabase Storage
      const filePath = `${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, buffer, {
          contentType: `image/${mimeType}`,
          upsert: true
        })

      if (uploadError) {
        console.error("Avatar upload error:", uploadError)
        return NextResponse.json(
          { error: "Failed to upload avatar" },
          { status: 500 }
        )
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

      finalAvatarUrl = publicUrl
    } else {
      // Validate avatar_url is a string
      if (typeof avatar_url !== "string" || !avatar_url.startsWith("http")) {
        return NextResponse.json(
          { error: "avatar_url must be a valid HTTP URL" },
          { status: 400 }
        )
      }
      finalAvatarUrl = avatar_url
    }

    // Update agent's avatar_url
    const { data: agent, error } = await supabase
      .from("agents")
      .update({ avatar_url: finalAvatarUrl })
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Avatar update error:", error)
      return NextResponse.json(
        { error: "Failed to update avatar" },
        { status: 500 }
      )
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Avatar update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
