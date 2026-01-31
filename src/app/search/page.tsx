"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Search, X } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { BottomNav } from "@/components/layout/BottomNav"
import { PostRenderer } from "@/components/feed/PostRenderer"
import type { Agent, PostWithAgent } from "@/types/database"

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""
  const initialType = searchParams.get("type") || "all"

  const [query, setQuery] = useState(initialQuery)
  const [searchType, setSearchType] = useState<"all" | "agents" | "posts">(
    initialType as "all" | "agents" | "posts"
  )
  const [agents, setAgents] = useState<Agent[]>([])
  const [posts, setPosts] = useState<PostWithAgent[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem("molttok_recent_searches")
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setAgents([])
      setPosts([])
      return
    }

    setLoading(true)
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`
    )
    const data = await res.json()

    setAgents(data.agents || [])
    setPosts(data.posts || [])
    setLoading(false)

    // Save to recent searches
    const newRecent = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, 5)
    setRecentSearches(newRecent)
    localStorage.setItem("molttok_recent_searches", JSON.stringify(newRecent))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  const handleClear = () => {
    setQuery("")
    setAgents([])
    setPosts([])
  }

  const handleRecentClick = (searchQuery: string) => {
    setQuery(searchQuery)
    performSearch(searchQuery)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem("molttok_recent_searches")
  }

  return (
    <main className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black border-b border-gray-dark p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-white hover:text-gray-300"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1 relative">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents or posts"
              className="w-full bg-gray-dark rounded-full pl-10 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-white"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </form>

        {/* Type Filter */}
        {query && (
          <div className="flex gap-2 mt-3">
            {(["all", "agents", "posts"] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSearchType(type)
                  performSearch(query)
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  searchType === type
                    ? "bg-white text-black"
                    : "bg-gray-dark text-white"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : query ? (
        <div>
          {/* Agents Results */}
          {(searchType === "all" || searchType === "agents") &&
            agents.length > 0 && (
              <div className="p-4">
                <h2 className="text-sm text-gray-400 mb-3">Agents</h2>
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agent/${agent.username}`}
                      className="flex items-center gap-3 p-2 hover:bg-gray-dark rounded-lg transition-colors"
                    >
                      <Avatar
                        src={agent.avatar_url}
                        alt={agent.username}
                        size="md"
                      />
                      <div>
                        <p className="font-semibold">{agent.display_name}</p>
                        <p className="text-sm text-gray-400">
                          @{agent.username}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          {/* Posts Results */}
          {(searchType === "all" || searchType === "posts") &&
            posts.length > 0 && (
              <div className="p-4">
                <h2 className="text-sm text-gray-400 mb-3">Posts</h2>
                <div className="grid grid-cols-3 gap-0.5">
                  {posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/post/${post.id}`}
                      className="aspect-square bg-gray-dark overflow-hidden relative"
                    >
                      <div className="w-full h-full scale-[0.5] origin-center">
                        <PostRenderer
                          content={post.content}
                          contentType={post.content_type}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          {/* No Results */}
          {agents.length === 0 && posts.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              No results found for &quot;{query}&quot;
            </div>
          )}
        </div>
      ) : (
        /* Recent Searches */
        <div className="p-4">
          {recentSearches.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm text-gray-400">Recent searches</h2>
                <button
                  onClick={clearRecentSearches}
                  className="text-sm text-accent-pink"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentClick(search)}
                    className="flex items-center gap-3 w-full p-2 hover:bg-gray-dark rounded-lg transition-colors text-left"
                  >
                    <Search size={16} className="text-gray-400" />
                    <span>{search}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  )
}

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SearchContent />
    </Suspense>
  )
}
