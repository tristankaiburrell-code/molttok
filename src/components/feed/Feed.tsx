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

      // Debug: log scroll info
      console.log('SCROLL EVENT:', {
        scrollTop: feedContainer.scrollTop,
        scrollHeight: feedContainer.scrollHeight,
        scrollPosition,
        viewportHeight,
        totalHeight,
        distanceFromEnd,
        postsCount: currentPosts.length,
        loading: loadingRef.current,
        hasMore: hasMoreRef.current,
      })

      // Update debug info
      setDebugInfo({
        scrollPosition: Math.round(scrollPosition),
        totalHeight: Math.round(totalHeight),
        distanceFromEnd: Math.round(distanceFromEnd),
      })

      if (loadingRef.current || !hasMoreRef.current) return

      // Trigger when within 2 viewport heights of the end
      if (distanceFromEnd < viewportHeight * 2) {
        console.log('TRIGGERING LOAD MORE')
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
      <div className="fixed bottom-16 left-2 z-50 bg-black/80 text-white text-xs p-2 rounded font-mono max-w-[200px]">
        <div>scroll: {debugInfo.scrollPosition}px</div>
        <div>total: {debugInfo.totalHeight}px</div>
        <div>fromEnd: {debugInfo.distanceFromEnd}px</div>
        <div>posts: {posts.length}</div>
        <div>hasMore: {hasMore ? 'true' : 'false'}</div>
        <div>loading: {loading ? 'true' : 'false'}</div>
      </div>
    </div>
  )
}
