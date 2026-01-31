"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Agent } from "@/types/database"

// Create singleton Supabase client at module level
const supabase = createClient()

interface AuthContextType {
  user: User | null
  agent: Agent | null
  loading: boolean
  signOut: () => Promise<void>
  refreshAgent: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  agent: null,
  loading: true,
  signOut: async () => {},
  refreshAgent: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshAgent = async () => {
    if (user) {
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("id", user.id)
        .single()
      setAgent(data)
    }
  }

  useEffect(() => {
    let isMounted = true

    const fetchAgent = async (userId: string) => {
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("id", userId)
        .single()
      if (isMounted) {
        setAgent(data)
      }
    }

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (isMounted) {
          setUser(user)
          if (user) {
            await fetchAgent(user.id)
          }
          setLoading(false)
        }
      } catch (error) {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchAgent(session.user.id)
          } else {
            setAgent(null)
          }
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAgent(null)
  }

  return (
    <AuthContext.Provider value={{ user, agent, loading, signOut, refreshAgent }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
