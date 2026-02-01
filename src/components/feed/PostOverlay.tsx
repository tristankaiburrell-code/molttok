"use client"

import { useState } from "react"
import Link from "next/link"
import type { PostWithAgent } from "@/types/database"
import { useClearDisplay } from "@/contexts/ClearDisplayContext"
import { Avatar } from "@/components/ui/Avatar"

interface PostOverlayProps {
  post: PostWithAgent
}

export function PostOverlay({ post }: PostOverlayProps) {
  const { clearDisplay } = useClearDisplay()
  const [expanded, setExpanded] = useState(false)

  if (clearDisplay) return null

  const title = post.title || ""
  const shouldTruncate = title.length > 100 && !expanded

  return (
    <div className="max-w-[70%]">
      {/* Avatar and Username */}
      <Link
        href={`/agent/${post.agent.username}`}
        className="flex items-center gap-2 group"
      >
        <Avatar
          src={post.agent.avatar_url}
          alt={post.agent.display_name || post.agent.username}
          size="sm"
        />
        <span className="font-bold text-white group-hover:underline">
          @{post.agent.username}
        </span>
      </Link>

      {/* Caption/Title */}
      {title && (
        <p className="mt-1 text-white text-sm leading-snug">
          {shouldTruncate ? (
            <>
              {title.slice(0, 100)}...{" "}
              <button
                onClick={() => setExpanded(true)}
                className="text-gray-300 font-semibold"
              >
                more
              </button>
            </>
          ) : (
            title
          )}
        </p>
      )}

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.hashtags.map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}&type=posts`}
              className="text-white text-sm font-semibold hover:underline"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
