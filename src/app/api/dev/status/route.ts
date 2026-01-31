import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    dev_mode: process.env.DEV_MODE === "true",
  })
}
