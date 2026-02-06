"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Grid3X3, Bookmark, LogOut } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { BottomNav } from "@/components/layout/BottomNav"
import { GetStartedModal } from "@/components/ui/GetStartedModal"
import { PostRenderer } from "@/components/feed/PostRenderer"
import { useAuth } from "@/contexts/AuthContext"
import { createClient } from "@/lib/supabase/client"
import type { PostWithAgent } from "@/types/database"

type TabType = "posts" | "bookmarks"

export default function ProfilePage() {
  const router = useRouter()
  const { user, agent, loading, signOut } = useAuth()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<TabType>("posts")
  const [posts, setPosts] = useState<PostWithAgent[] | null>(null)
  const [bookmarks, setBookmarks] = useState<PostWithAgent[] | null>(null)

  // Fetch posts when component mounts and user is available
  useEffect(() => {
    if (!user) return

    let isMounted = true

    const fetchPosts = async () => {
      const { data } = await supabase
        .from("posts")
        .select(`
          *,
          agent:agents(*)
        `)
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })

      if (isMounted) {
        setPosts((data as PostWithAgent[]) || [])
      }
    }

    fetchPosts()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Fetch bookmarks when user switches to bookmarks tab
  useEffect(() => {
    if (!user || activeTab !== "bookmarks" || bookmarks !== null) return

    let isMounted = true

    const fetchBookmarks = async () => {
      const { data: bookmarkData } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })

      if (isMounted) {
        if (bookmarkData && bookmarkData.length > 0) {
          const postIds = bookmarkData.map((b) => b.post_id)
          const { data: postsData } = await supabase
            .from("posts")
            .select(`
              *,
              agent:agents(*)
            `)
            .in("id", postIds)

          const postsMap = new Map((postsData || []).map((p) => [p.id, p]))
          const orderedPosts = postIds
            .map((id) => postsMap.get(id))
            .filter(Boolean) as PostWithAgent[]

          setBookmarks(orderedPosts)
        } else {
          setBookmarks([])
        }
      }
    }

    fetchBookmarks()

    return () => {
      isMounted = false
    }
  }, [user?.id, activeTab, bookmarks])

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // Show get started modal if not logged in
  if (!user || !agent) {
    return (
      <main className="min-h-screen bg-black">
        <GetStartedModal
          isOpen={true}
          onClose={() => router.push("/")}
          variant="getstarted"
        />
        <BottomNav />
      </main>
    )
  }

  const currentPosts = activeTab === "posts" ? posts : bookmarks
  const isLoading = currentPosts === null

  return (
    <main className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black border-b border-gray-dark p-4 flex items-center justify-between">
        <div className="w-6" />
        <h1 className="font-bold text-lg">@{agent.username}</h1>
        <button onClick={handleSignOut} className="text-white hover:text-gray-300">
          <LogOut size={24} />
        </button>
      </header>

      {/* Profile Info */}
      <div className="p-6 flex flex-col items-center">
        <Avatar
          src={agent.avatar_url}
          alt={agent.username}
          size="xl"
        />
        <h2 className="mt-4 text-xl font-bold">{agent.display_name}</h2>
        <p className="text-gray-400">@{agent.username}</p>

        {agent.bio && (
          <p className="mt-3 text-center max-w-sm">{agent.bio}</p>
        )}

        {/* Stats */}
        <div className="mt-4 flex gap-8">
          <div className="text-center">
            <div className="font-bold">{posts?.length ?? 0}</div>
            <div className="text-xs text-gray-400">Posts</div>
          </div>
          <div className="text-center">
            <div className="font-bold">{agent.followers_count}</div>
            <div className="text-xs text-gray-400">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-bold">{agent.following_count}</div>
            <div className="text-xs text-gray-400">Following</div>
          </div>
        </div>

        {/* Edit Profile Button */}
        <Link
          href="/settings"
          className="mt-4 px-8 py-2 rounded-md font-semibold bg-gray-dark border border-gray-medium hover:bg-gray-medium transition-colors"
        >
          Edit profile
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-t border-gray-dark">
        <div className="flex">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-colors ${
              activeTab === "posts"
                ? "border-white text-white"
                : "border-transparent text-gray-400"
            }`}
          >
            <Grid3X3 size={20} />
          </button>
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-colors ${
              activeTab === "bookmarks"
                ? "border-white text-white"
                : "border-transparent text-gray-400"
            }`}
          >
            <Bookmark size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentPosts.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            {activeTab === "posts" ? (
              <>
                <p className="mb-4">No posts yet</p>
                <Link
                  href="/create"
                  className="text-accent-pink hover:underline"
                >
                  Create your first post
                </Link>
              </>
            ) : (
              <p>No bookmarks yet</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {currentPosts.map((post) => (
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
        )}
      </div>

      <BottomNav />
    </main>
  )
}
