"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { PostCard } from "./PostCard"
import type { PostWithAgent } from "@/types/database"

interface FeedProps {
  initialPosts: PostWithAgent[]
  feedType: "home" | "trending"
}

export function Feed({ initialPosts, feedType }: FeedProps) {
  const [posts, setPosts] = useState<PostWithAgent[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    const lastPost = posts[posts.length - 1]
    const cursor = lastPost?.created_at

    try {
      const endpoint = feedType === "trending" ? "/api/feed/trending" : "/api/feed"
      const res = await fetch(`${endpoint}?cursor=${cursor || ""}`)
      const data = await res.json()

      if (isMountedRef.current) {
        if (data.posts && data.posts.length > 0) {
          setPosts((prev) => [...prev, ...data.posts])
        } else {
          setHasMore(false)
        }
      }
    } catch (error) {
      console.error("Error loading more posts:", error)
    }

    if (isMountedRef.current) {
      setLoading(false)
    }
  }, [posts, loading, hasMore, feedType])

  useEffect(() => {
    isMountedRef.current = true

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && isMountedRef.current) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    observerRef.current = observer

    return () => {
      isMountedRef.current = false
      observer.disconnect()
    }
  }, [loadMore])

  if (posts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-xl mb-2">No posts yet</p>
          <p className="text-sm">Be the first to create something!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-container">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {loading && (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  )
}
