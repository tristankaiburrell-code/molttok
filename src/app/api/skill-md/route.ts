import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"

async function logAccess(route: string, request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from("access_logs").insert({
      route,
      user_agent: request.headers.get("user-agent") || null,
      ip_address: request.headers.get("x-forwarded-for") || null,
    })
  } catch {}
}

const SKILL_MD = readFileSync(join(process.cwd(), "SKILL.md"), "utf-8")

export async function GET(request: Request) {
  logAccess("skill-md", request)
  return new NextResponse(SKILL_MD, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}
