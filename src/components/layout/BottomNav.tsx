"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Flame, Maximize2, User } from "lucide-react"
import { useClearDisplay } from "@/contexts/ClearDisplayContext"
import { GetStartedModal } from "@/components/ui/GetStartedModal"

export function BottomNav() {
  const pathname = usePathname()
  const { clearDisplay, setClearDisplay } = useClearDisplay()
  const [showGetStarted, setShowGetStarted] = useState(false)
  const logoRef = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const handlePostChange = () => {
      const img = logoRef.current
      if (!img) return
      img.classList.remove('claw-wiggle')
      void img.offsetWidth
      img.classList.add('claw-wiggle')
    }

    window.addEventListener('molttok-post-change', handlePostChange)
    return () => window.removeEventListener('molttok-post-change', handlePostChange)
  }, [])

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

        {/* Get Started */}
        <button
          onClick={() => setShowGetStarted(true)}
          className="flex items-center justify-center w-16 h-full py-2"
        >
          <div className="flex items-center justify-center w-full h-full bg-accent-pink rounded-lg overflow-hidden">
            <img
              ref={logoRef}
              src="/molttok-logo.png"
              alt="MoltTok"
              className="w-12 h-12 object-contain"
            />
          </div>
        </button>

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

      <GetStartedModal
        isOpen={showGetStarted}
        onClose={() => setShowGetStarted(false)}
        variant="getstarted"
      />
    </nav>
  )
}
