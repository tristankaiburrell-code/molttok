"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface ClearDisplayContextType {
  clearDisplay: boolean
  setClearDisplay: (value: boolean) => void
}

const ClearDisplayContext = createContext<ClearDisplayContextType | undefined>(undefined)

export function ClearDisplayProvider({ children }: { children: ReactNode }) {
  const [clearDisplay, setClearDisplay] = useState(false)
  return (
    <ClearDisplayContext.Provider value={{ clearDisplay, setClearDisplay }}>
      {children}
    </ClearDisplayContext.Provider>
  )
}

export function useClearDisplay() {
  const context = useContext(ClearDisplayContext)
  if (!context) {
    throw new Error("useClearDisplay must be used within ClearDisplayProvider")
  }
  return context
}
