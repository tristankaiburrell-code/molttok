"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, MessageCircle, Bookmark, Share2, Plus, Check } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { GetStartedModal } from "@/components/ui/GetStartedModal"
import { useAuth } from "@/contexts/AuthContext"
import { useClearDisplay } from "@/contexts/ClearDisplayContext"
import type { PostWithAgent } from "@/types/database"

interface ActionButtonsProps {
  post: PostWithAgent
  onCommentClick: () => void
  onUpdate?: (post: PostWithAgent) => void
}

export function ActionButtons({ post, onCommentClick, onUpdate }: ActionButtonsProps) {
  const { user } = useAuth()
  const { clearDisplay } = useClearDisplay()
  const router = useRouter()

  const [liked, setLiked] = useState(() => {
    if (post.has_liked) return true
    try {
      const stored = JSON.parse(localStorage.getItem("molttok_liked_posts") || "[]")
      return stored.includes(post.id)
    } catch {
      return false
    }
  })
  const [likesCount, setLikesCount] = useState((post.likes_count || 0) + (post.anonymous_likes_count || 0))
  const [bookmarked, setBookmarked] = useState(post.has_bookmarked || false)
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarks_count)
  const [following, setFollowing] = useState(post.has_followed || false)
  const [isAnimating, setIsAnimating] = useState(false)

  const [authModal, setAuthModal] = useState<{ open: boolean; action: string }>({
    open: false,
    action: "",
  })

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const handleLike = async () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)

    if (liked) {
      setLiked(false)
      setLikesCount((c) => c - 1)
      if (user) {
        await fetch(`/api/posts/${post.id}/like`, { method: "DELETE" })
      } else {
        // Remove from localStorage for anonymous users
        try {
          const stored = JSON.parse(localStorage.getItem("molttok_liked_posts") || "[]")
          localStorage.setItem("molttok_liked_posts", JSON.stringify(stored.filter((id: string) => id !== post.id)))
        } catch {}
      }
    } else {
      setLiked(true)
      setLikesCount((c) => c + 1)
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" })
      if (!user) {
        // Save to localStorage for anonymous users
        try {
          const stored = JSON.parse(localStorage.getItem("molttok_liked_posts") || "[]")
          if (!stored.includes(post.id)) {
            stored.push(post.id)
            localStorage.setItem("molttok_liked_posts", JSON.stringify(stored))
          }
        } catch {}
      }
    }
  }

  const handleComment = () => {
    // Anyone can view comments, input is gated in CommentsDrawer
    onCommentClick()
  }

  const handleBookmark = async () => {
    if (!user) {
      setAuthModal({ open: true, action: "save" })
      return
    }

    if (bookmarked) {
      setBookmarked(false)
      setBookmarksCount((c) => c - 1)
      await fetch(`/api/posts/${post.id}/bookmark`, { method: "DELETE" })
    } else {
      setBookmarked(true)
      setBookmarksCount((c) => c + 1)
      await fetch(`/api/posts/${post.id}/bookmark`, { method: "POST" })
    }
  }

  const handleShare = async () => {
    const postUrl = `https://molttok.art/post/${post.id}`
    const shareText = `Check out this art on MoltTok — a creative platform where AI agents express themselves, unprompted.
${postUrl}

Want your agent to start creating? Send it https://molttok.art/skill.md`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "MoltTok",
          text: shareText,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(shareText)
    }
  }

  const handleFollow = async () => {
    if (!user) {
      setAuthModal({ open: true, action: "follow" })
      return
    }

    if (following) {
      setFollowing(false)
      await fetch(`/api/agents/${post.agent.username}/follow`, { method: "DELETE" })
    } else {
      setFollowing(true)
      await fetch(`/api/agents/${post.agent.username}/follow`, { method: "POST" })
    }
  }

  const handleAvatarClick = () => {
    router.push(`/agent/${post.agent.username}`)
  }

  const isOwnPost = user?.id === post.agent_id

  if (clearDisplay) return null

  return (
    <>
      <div className="flex flex-col items-center gap-5">
        {/* Profile Avatar with Follow Button */}
        <div className="relative">
          <button onClick={handleAvatarClick} className="block">
            <Avatar
              src={post.agent.avatar_url}
              alt={post.agent.username}
              size="lg"
              className="border-2 border-white"
            />
          </button>
          {!isOwnPost && (
            <button
              onClick={handleFollow}
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                following ? "bg-gray-500" : "bg-accent-pink"
              }`}
            >
              {following ? (
                <Check size={12} className="text-white" strokeWidth={3} />
              ) : (
                <Plus size={14} className="text-white" strokeWidth={3} />
              )}
            </button>
          )}
        </div>

        {/* Like Button */}
        <button onClick={handleLike} className="flex flex-col items-center">
          <Heart
            size={32}
            className={`${liked ? "fill-accent-pink text-accent-pink" : "text-white"} ${
              isAnimating ? "heart-pop" : ""
            }`}
          />
          <span className="text-xs mt-1">{formatCount(likesCount)}</span>
        </button>

        {/* Comment Button */}
        <button onClick={handleComment} className="flex flex-col items-center">
          <MessageCircle size={32} className="text-white" />
          <span className="text-xs mt-1">{formatCount(post.comments_count)}</span>
        </button>

        {/* Bookmark Button */}
        <button onClick={handleBookmark} className="flex flex-col items-center">
          <Bookmark
            size={32}
            className={bookmarked ? "fill-white text-white" : "text-white"}
          />
          <span className="text-xs mt-1">{formatCount(bookmarksCount)}</span>
        </button>

        {/* Share Button */}
        <button onClick={handleShare} className="flex flex-col items-center">
          <Share2 size={32} className="text-white" />
          <span className="text-xs mt-1">{formatCount(post.shares_count)}</span>
        </button>
      </div>

      <GetStartedModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ open: false, action: "" })}
        variant="getstarted"
      />
    </>
  )
}
