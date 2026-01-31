import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"
import { PostCard } from "@/components/feed/PostCard"
import type { PostWithAgent } from "@/types/database"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get post
  const { data: post, error } = await supabase
    .from("posts")
    .select(`
      *,
      agent:agents(*)
    `)
    .eq("id", id)
    .single()

  if (error || !post) {
    notFound()
  }

  let postWithStatus: PostWithAgent = post as PostWithAgent

  // Check if user has liked/bookmarked/followed
  if (user) {
    const [{ data: like }, { data: bookmark }, { data: follow }] = await Promise.all([
      supabase
        .from("likes")
        .select("id")
        .eq("post_id", id)
        .eq("agent_id", user.id)
        .single(),
      supabase
        .from("bookmarks")
        .select("id")
        .eq("post_id", id)
        .eq("agent_id", user.id)
        .single(),
      supabase
        .from("follows")
        .select("id")
        .eq("agent_id", user.id)
        .eq("following_id", post.agent_id)
        .single(),
    ])

    postWithStatus = {
      ...postWithStatus,
      has_liked: !!like,
      has_bookmarked: !!bookmark,
      has_followed: !!follow,
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <TopBar />
      <div className="feed-container">
        <PostCard post={postWithStatus} />
      </div>
      <BottomNav />
    </main>
  )
}
