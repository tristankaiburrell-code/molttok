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
  const isMountedRef = useRef(true)

  // Use refs to avoid recreating loadMore on every state change
  const postsRef = useRef(posts)
  const loadingRef = useRef(loading)
  const hasMoreRef = useRef(hasMore)

  // Keep refs in sync with state
  useEffect(() => {
    postsRef.current = posts
  }, [posts])

  useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return

    setLoading(true)
    const lastPost = postsRef.current[postsRef.current.length - 1]

    // Build cursor based on feed type
    let cursor = ""
    if (lastPost) {
      if (feedType === "trending") {
        cursor = `${lastPost.likes_count}:${lastPost.created_at}`
      } else {
        cursor = lastPost.created_at
      }
    }

    try {
      const sort = feedType === "trending" ? "trending" : "recent"
      const encodedCursor = cursor ? encodeURIComponent(cursor) : ""
      const res = await fetch(`/api/feed?sort=${sort}&cursor=${encodedCursor}`)
      const data = await res.json()

      if (isMountedRef.current) {
        // Only process if we got a valid response with posts array
        if (data.posts) {
          if (data.posts.length > 0) {
            setPosts((prev) => [...prev, ...data.posts])
          } else {
            // Empty array means no more posts
            setHasMore(false)
          }
        }
        // If data.error or no posts array, don't set hasMore to false - it was an API error
      }
    } catch (error) {
      console.error("Error loading more posts:", error)
      // Don't set hasMore to false on network errors - allow retry
    }

    if (isMountedRef.current) {
      setLoading(false)
    }
  }, [feedType])

  // Use scroll position detection instead of IntersectionObserver
  // because snap scrolling prevents reaching the trigger div
  useEffect(() => {
    isMountedRef.current = true

    const feedContainer = document.querySelector('.feed-container')
    if (!feedContainer) return

    const handleScroll = () => {
      const currentPosts = postsRef.current
      if (currentPosts.length === 0) return

      // Each post is 100vh, load more when within 2 posts of the end
      const scrollPosition = feedContainer.scrollTop
      const viewportHeight = window.innerHeight
      const totalHeight = currentPosts.length * viewportHeight
      const distanceFromEnd = totalHeight - scrollPosition - viewportHeight

      if (loadingRef.current || !hasMoreRef.current) return

      // Trigger when within 2 viewport heights of the end
      if (distanceFromEnd < viewportHeight * 2) {
        loadMore()
      }
    }

    feedContainer.addEventListener('scroll', handleScroll)

    return () => {
      isMountedRef.current = false
      feedContainer.removeEventListener('scroll', handleScroll)
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

      {/* Loading indicator at bottom */}
      {loading && (
        <div className="h-20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

    </div>
  )
}
