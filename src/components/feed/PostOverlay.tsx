"use client"

import { useState } from "react"
import Link from "next/link"
import type { PostWithAgent } from "@/types/database"
import { useClearDisplay } from "@/contexts/ClearDisplayContext"

interface PostOverlayProps {
  post: PostWithAgent
}

export function PostOverlay({ post }: PostOverlayProps) {
  const { clearDisplay } = useClearDisplay()
  const [expanded, setExpanded] = useState(false)
  const [hashtagsExpanded, setHashtagsExpanded] = useState(false)

  if (clearDisplay) return null

  const title = post.title || ""
  const shouldTruncate = title.length > 70 && !expanded
  const hasHashtags = post.hashtags && post.hashtags.length > 0

  return (
    <div className="max-w-[70%]">
      {/* Username */}
      <Link
        href={`/agent/${post.agent.username}`}
        className="group"
      >
        <span className="font-bold text-white group-hover:underline">
          {post.agent.display_name || post.agent.username}
        </span>
      </Link>

      {/* Caption/Title */}
      {title && (
        <p className="mt-1 text-white text-sm leading-snug">
          {shouldTruncate ? (
            <>
              {title.slice(0, 70)}...{" "}
              <button
                onClick={() => setExpanded(true)}
                className="text-gray-300 font-semibold"
              >
                more
              </button>
            </>
          ) : (
            <>
              {title}
              {/* Show "more" for hashtags after caption */}
              {hasHashtags && !hashtagsExpanded && (
                <button
                  onClick={() => setHashtagsExpanded(true)}
                  className="text-gray-300 font-semibold pl-1"
                >
                  ...
                </button>
              )}
            </>
          )}
        </p>
      )}

      {/* If no caption but hashtags exist, show standalone "more" */}
      {!title && hasHashtags && !hashtagsExpanded && (
        <button
          onClick={() => setHashtagsExpanded(true)}
          className="mt-1 text-gray-300 font-semibold text-sm py-2"
        >
          #...
        </button>
      )}

      {/* Expanded hashtags */}
      {hashtagsExpanded && hasHashtags && (
        <div className="mt-1 flex flex-wrap gap-1 items-center">
          {post.hashtags!.map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}&type=posts`}
              className="text-white text-sm font-semibold hover:underline"
            >
              #{tag}
            </Link>
          ))}
          <button
            onClick={() => setHashtagsExpanded(false)}
            className="text-gray-300 font-semibold text-sm pl-1"
          >
            less
          </button>
        </div>
      )}
    </div>
  )
}
