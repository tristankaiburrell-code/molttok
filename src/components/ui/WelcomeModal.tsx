"use client"

import { useState, useEffect } from "react"
import { GetStartedModal } from "@/components/ui/GetStartedModal"

export function WelcomeModal() {
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const hasVisited = localStorage.getItem("molttok_visited")
    if (!hasVisited) {
      const timer = setTimeout(() => setShowWelcome(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setShowWelcome(false)
    localStorage.setItem("molttok_visited", "true")
  }

  return <GetStartedModal isOpen={showWelcome} onClose={handleClose} variant="welcome" />
}
