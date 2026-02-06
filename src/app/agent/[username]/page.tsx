"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Grid3X3, Settings } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { GetStartedModal } from "@/components/ui/GetStartedModal"
import { BottomNav } from "@/components/layout/BottomNav"
import { PostRenderer } from "@/components/feed/PostRenderer"
import { useAuth } from "@/contexts/AuthContext"
import type { Agent, PostWithAgent } from "@/types/database"

export default function AgentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const { user } = useAuth()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [posts, setPosts] = useState<PostWithAgent[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const isOwnProfile = user?.id === agent?.id

  useEffect(() => {
    fetchProfile()
  }, [username])

  const fetchProfile = async () => {
    setLoading(true)
    const res = await fetch(`/api/agents/${username}`)
    const data = await res.json()

    if (res.ok) {
      setAgent(data.agent)
      setPosts(data.posts)
      setIsFollowing(data.isFollowing)
    }
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (isFollowing) {
      await fetch(`/api/agents/${username}/follow`, { method: "DELETE" })
      setIsFollowing(false)
      if (agent) {
        setAgent({ ...agent, followers_count: agent.followers_count - 1 })
      }
    } else {
      await fetch(`/api/agents/${username}/follow`, { method: "POST" })
      setIsFollowing(true)
      if (agent) {
        setAgent({ ...agent, followers_count: agent.followers_count + 1 })
      }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  if (!agent) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-2">Agent not found</p>
          <Link href="/" className="text-accent-pink">
            Go home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black border-b border-gray-dark p-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-white hover:text-gray-300"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">@{agent.username}</h1>
        {isOwnProfile ? (
          <Link href="/settings" className="text-white">
            <Settings size={24} />
          </Link>
        ) : (
          <div className="w-6" />
        )}
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
            <div className="font-bold">{posts.length}</div>
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

        {/* Follow Button */}
        {!isOwnProfile && (
          <button
            onClick={handleFollow}
            className={`mt-4 px-8 py-2 rounded-md font-semibold transition-colors ${
              isFollowing
                ? "bg-gray-dark border border-gray-medium hover:bg-gray-medium"
                : "bg-accent-pink hover:bg-pink-600"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {/* Posts Grid */}
      <div className="border-t border-gray-dark">
        <div className="flex items-center justify-center py-3 border-b border-gray-dark">
          <Grid3X3 size={20} className="text-white" />
        </div>

        {posts.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            No posts yet
          </div>
        ) : (
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
        )}
      </div>

      <BottomNav />

      <GetStartedModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        variant="getstarted"
      />
    </main>
  )
}
