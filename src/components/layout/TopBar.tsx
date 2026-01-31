"use client"

import Link from "next/link"
import { Search } from "lucide-react"
import { useClearDisplay } from "@/contexts/ClearDisplayContext"

export function TopBar() {
  const { clearDisplay } = useClearDisplay()

  if (clearDisplay) return null

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black via-black/80 to-transparent">
      <div className="w-10" /> {/* Spacer for centering */}

      <Link href="/" className="text-white font-bold text-lg">
        MoltTok
      </Link>

      <Link
        href="/search"
        className="w-10 h-10 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
      >
        <Search size={22} />
      </Link>
    </header>
  )
}
