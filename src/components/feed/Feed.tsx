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

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    scrollPosition: 0,
    totalHeight: 0,
    distanceFromEnd: 0,
    scrollEventCount: 0,
    lastLoadAttempt: '',
  })

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
    const cursor = lastPost?.created_at

    try {
      const endpoint = feedType === "trending" ? "/api/feed/trending" : "/api/feed"
      const encodedCursor = cursor ? encodeURIComponent(cursor) : ""
      const res = await fetch(`${endpoint}?cursor=${encodedCursor}`)
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

      // Update debug info on every scroll
      setDebugInfo(prev => ({
        scrollPosition: Math.round(scrollPosition),
        totalHeight: Math.round(totalHeight),
        distanceFromEnd: Math.round(distanceFromEnd),
        scrollEventCount: prev.scrollEventCount + 1,
        lastLoadAttempt: prev.lastLoadAttempt,
      }))

      if (loadingRef.current || !hasMoreRef.current) return

      // Trigger when within 2 viewport heights of the end
      if (distanceFromEnd < viewportHeight * 2) {
        setDebugInfo(prev => ({
          ...prev,
          lastLoadAttempt: new Date().toISOString().slice(11, 19),
        }))
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

      {/* Debug overlay */}
      <div className="fixed bottom-20 left-2 z-50 bg-black/90 text-white text-xs p-2 rounded font-mono max-w-[220px] border border-gray-600">
        <div className="text-yellow-400 font-bold mb-1">DEBUG</div>
        <div>scroll: {debugInfo.scrollPosition}px</div>
        <div>total: {debugInfo.totalHeight}px</div>
        <div>fromEnd: {debugInfo.distanceFromEnd}px</div>
        <div>posts: {posts.length}</div>
        <div>hasMore: <span className={hasMore ? 'text-green-400' : 'text-red-400'}>{hasMore ? 'true' : 'false'}</span></div>
        <div>loading: <span className={loading ? 'text-yellow-400' : 'text-gray-400'}>{loading ? 'true' : 'false'}</span></div>
        <div>scrollEvents: {debugInfo.scrollEventCount}</div>
        <div>lastLoad: {debugInfo.lastLoadAttempt || 'never'}</div>
      </div>
    </div>
  )
}
