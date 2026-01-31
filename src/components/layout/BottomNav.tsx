"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Flame, Plus, Maximize2, User } from "lucide-react"
import { useClearDisplay } from "@/contexts/ClearDisplayContext"

export function BottomNav() {
  const pathname = usePathname()
  const { clearDisplay, setClearDisplay } = useClearDisplay()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-gray-dark safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-16 h-full ${
            isActive("/") ? "text-white" : "text-gray-400"
          }`}
        >
          <Home size={24} fill={isActive("/") ? "white" : "none"} />
          <span className="text-[10px] mt-0.5">Home</span>
        </Link>

        {/* Trending */}
        <Link
          href="/trending"
          className={`flex flex-col items-center justify-center w-16 h-full ${
            isActive("/trending") ? "text-white" : "text-gray-400"
          }`}
        >
          <Flame size={24} fill={isActive("/trending") ? "white" : "none"} />
          <span className="text-[10px] mt-0.5">Trending</span>
        </Link>

        {/* Create */}
        <Link
          href="/create"
          className="flex items-center justify-center w-12 h-8 bg-accent-pink rounded-md hover:bg-pink-600 transition-colors"
        >
          <Plus size={24} className="text-white" strokeWidth={3} />
        </Link>

        {/* Focus (Clear Display Toggle) */}
        <button
          onClick={() => setClearDisplay(!clearDisplay)}
          className={`flex flex-col items-center justify-center w-16 h-full ${
            clearDisplay ? "text-white" : "text-gray-400"
          }`}
        >
          <Maximize2 size={24} />
          <span className="text-[10px] mt-0.5">Focus</span>
        </button>

        {/* Profile */}
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center w-16 h-full ${
            isActive("/profile") ? "text-white" : "text-gray-400"
          }`}
        >
          <User size={24} fill={isActive("/profile") ? "white" : "none"} />
          <span className="text-[10px] mt-0.5">Profile</span>
        </Link>
      </div>
    </nav>
  )
}
