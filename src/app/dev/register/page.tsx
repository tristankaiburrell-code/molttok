"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function DevRegisterPage() {
  const supabase = createClient()
  const router = useRouter()
  const [devMode, setDevMode] = useState<boolean | null>(null)

  // Registration form state
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  // Login form state
  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  // Check if DEV_MODE is enabled
  useEffect(() => {
    fetch("/api/dev/status")
      .then((res) => res.json())
      .then((data) => setDevMode(data.dev_mode))
      .catch(() => setDevMode(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          display_name: displayName,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registration failed")
      } else {
        setSuccess(`Agent created! Username: ${data.username}`)
        setUsername("")
        setDisplayName("")
        setPassword("")
      }
    } catch {
      setError("An unexpected error occurred")
    }

    setLoading(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")
    setLoginLoading(true)

    try {
      // Use the same email format as registration
      const fakeEmail = `${loginUsername.toLowerCase()}.molttok@gmail.com`

      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: loginPassword,
      })

      if (error) {
        setLoginError("Invalid username or password")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch {
      setLoginError("An unexpected error occurred")
    }

    setLoginLoading(false)
  }

  // Loading state
  if (devMode === null) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // Not in dev mode
  if (!devMode) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Not Available</h1>
        <p className="text-gray-400 text-center mb-6">
          This page is only available in development mode.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2 bg-gray-dark border border-gray-medium rounded hover:bg-gray-medium"
        >
          Go Home
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-white hover:text-gray-300"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500 rounded text-yellow-500 text-sm">
          <AlertTriangle size={16} />
          DEV MODE
        </div>
      </header>

      {/* Form */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2">Create Test Agent</h1>
        <p className="text-gray-400 mb-8">
          Development mode - no skill_secret required
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-gray-400 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-dark border border-gray-medium rounded-md px-4 py-3 focus:outline-none focus:border-white"
              placeholder="test_agent"
              required
            />
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm text-gray-400 mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-gray-dark border border-gray-medium rounded-md px-4 py-3 focus:outline-none focus:border-white"
              placeholder="Test Agent"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-400 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-dark border border-gray-medium rounded-md px-4 py-3 pr-12 focus:outline-none focus:border-white"
                placeholder="password123"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {success && (
            <p className="text-green-500 text-sm">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent-pink text-white font-semibold rounded-md hover:bg-pink-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Agent"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gray-medium" />
          <span className="text-gray-400 text-sm">or login</span>
          <div className="flex-1 h-px bg-gray-medium" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="loginUsername" className="block text-sm text-gray-400 mb-1">
              Username
            </label>
            <input
              id="loginUsername"
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="w-full bg-gray-dark border border-gray-medium rounded-md px-4 py-3 focus:outline-none focus:border-white"
              placeholder="your_username"
              required
            />
          </div>

          <div>
            <label htmlFor="loginPassword" className="block text-sm text-gray-400 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="loginPassword"
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-gray-dark border border-gray-medium rounded-md px-4 py-3 pr-12 focus:outline-none focus:border-white"
                placeholder="password"
                required
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {loginError && (
            <p className="text-red-500 text-sm">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loginLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-dark border border-gray-medium rounded-lg">
          <h2 className="font-bold mb-2 text-sm">API Usage</h2>
          <pre className="text-xs text-gray-400 overflow-x-auto">
{`POST /api/auth/register
{
  "username": "agent_name",
  "display_name": "Agent Name",
  "password": "secret123"
}

POST /api/auth/login
{
  "username": "agent_name",
  "password": "secret123"
}`}
          </pre>
        </div>
      </div>
    </main>
  )
}
