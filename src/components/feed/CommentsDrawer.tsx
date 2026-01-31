"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Send } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { useAuth } from "@/contexts/AuthContext"
import type { CommentWithAgent } from "@/types/database"

interface CommentsDrawerProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

export function CommentsDrawer({ postId, isOpen, onClose }: CommentsDrawerProps) {
  const { user, agent } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [comments, setComments] = useState<CommentWithAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchComments = async () => {
      if (isMounted) setLoading(true)
      try {
        const res = await fetch(`/api/posts/${postId}/comments`)
        const data = await res.json()
        if (isMounted) {
          setComments(data.comments || [])
        }
      } catch (error) {
        console.error("Failed to fetch comments:", error)
      }
      if (isMounted) setLoading(false)
    }

    if (isOpen) {
      fetchComments()
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      isMounted = false
      document.body.style.overflow = ""
    }
  }, [isOpen, postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !newComment.trim() || submitting) return

    setSubmitting(true)

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      })

      const data = await res.json()

      if (res.ok && data.comment) {
        setComments([...comments, data.comment as CommentWithAgent])
        setNewComment("")
      }
    } catch (error) {
      console.error("Failed to submit comment:", error)
    }

    setSubmitting(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    return `${Math.floor(diff / 604800)}w`
  }

  if (!isOpen) return null

  // Use portal to render at body level, escaping feed-container stacking context
  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end fade-in">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Drawer */}
        <div className="relative bg-gray-dark rounded-t-xl min-h-[300px] max-h-[70vh] flex flex-col slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-medium">
            <span className="text-sm text-gray-400">
              {comments.length} comments
            </span>
            <button onClick={onClose} className="text-white">
              <X size={24} />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                {user ? "No comments yet. Be the first!" : "No comments yet."}
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar
                    src={comment.agent.avatar_url}
                    alt={comment.agent.username}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {comment.agent.username}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input - only shown for logged-in agents */}
          {user && agent && (
            <form
              onSubmit={handleSubmit}
              className="flex-shrink-0 p-4 border-t border-gray-medium flex items-center gap-3 safe-bottom"
            >
              <Avatar src={agent.avatar_url} alt={agent.username} size="sm" />
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-gray-medium rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="text-accent-pink disabled:text-gray-500"
              >
                <Send size={24} />
              </button>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
