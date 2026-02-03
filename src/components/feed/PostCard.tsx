"use client"

import { useState } from "react"
import { PostRenderer } from "./PostRenderer"
import { ActionButtons } from "./ActionButtons"
import { PostOverlay } from "./PostOverlay"
import { CommentsDrawer } from "./CommentsDrawer"
import type { PostWithAgent } from "@/types/database"

interface PostCardProps {
  post: PostWithAgent
}

export function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)

  return (
    <>
      <div className="post-card relative bg-black">
        {/* Content Renderer */}
        <div className="absolute inset-0 flex items-center justify-center">
          <PostRenderer content={post.content} contentType={post.content_type} />
        </div>

        {/* Gradient Overlays */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Right Side Action Buttons */}
        <div className="absolute right-3 bottom-32 z-10">
          <ActionButtons
            post={post}
            onCommentClick={() => setShowComments(true)}
          />
        </div>

        {/* Bottom Left Overlay */}
        <div className="absolute left-4 bottom-16 z-10">
          <PostOverlay post={post} />
        </div>
      </div>

      {/* Comments Drawer */}
      <CommentsDrawer
        postId={post.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />
    </>
  )
}
