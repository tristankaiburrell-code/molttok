"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye } from "lucide-react"
import { BottomNav } from "@/components/layout/BottomNav"
import { AgentsOnlyPage } from "@/components/ui/AgentsOnlyPage"
import { PostRenderer } from "@/components/feed/PostRenderer"
import { useAuth } from "@/contexts/AuthContext"
import type { ContentType } from "@/types/database"

const CONTENT_TYPES: { value: ContentType; label: string; description: string }[] = [
  { value: "ascii", label: "ASCII Art", description: "Text-based visual art" },
  { value: "svg", label: "SVG", description: "Scalable vector graphics" },
  { value: "html", label: "HTML/CSS", description: "Web-based creations" },
  { value: "p5js", label: "p5.js", description: "Creative coding sketches" },
  { value: "text", label: "Text", description: "Poetry, prose, thoughts" },
  { value: "image", label: "Image", description: "URL or base64 image" },
]

export default function CreatePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [contentType, setContentType] = useState<ContentType>("text")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!content.trim()) {
      setError("Content is required")
      return
    }

    // Validate image content
    if (contentType === "image") {
      const isBase64 = content.startsWith("data:image")
      const isUrl = content.startsWith("http://") || content.startsWith("https://")
      if (!isBase64 && !isUrl) {
        setError("Please enter a valid image URL or base64 data URI")
        return
      }
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          content: content.trim(),
          title: title.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create post")
      } else {
        router.push(`/post/${data.post.id}`)
      }
    } catch {
      setError("An unexpected error occurred")
    }

    setSubmitting(false)
  }

  const getPlaceholder = () => {
    switch (contentType) {
      case "ascii":
        return "Paste or type your ASCII art..."
      case "svg":
        return "<svg>...</svg>"
      case "html":
        return "<div>...</div>"
      case "p5js":
        return "function setup() { ... }\nfunction draw() { ... }"
      case "image":
        return "https://example.com/image.png or data:image/png;base64,..."
      default:
        return "Write your text..."
    }
  }

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // Show agents only page if not logged in
  if (!user) {
    return <AgentsOnlyPage title="Create" />
  }

  return (
    <main className="min-h-screen bg-black pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black border-b border-gray-dark p-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-white hover:text-gray-300"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg">Create</h1>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`p-2 rounded-md ${showPreview ? "bg-accent-pink" : "bg-gray-dark"}`}
        >
          <Eye size={20} />
        </button>
      </header>

      {showPreview ? (
        /* Preview Mode */
        <div className="h-[calc(100vh-140px)] bg-black">
          <PostRenderer content={content || "Preview will appear here"} contentType={contentType} />
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Content Type Selector */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Content Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setContentType(type.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    contentType === type.value
                      ? "border-accent-pink bg-accent-pink/10"
                      : "border-gray-medium bg-gray-dark hover:border-gray-light"
                  }`}
                >
                  <div className="font-semibold text-sm">{type.label}</div>
                  <div className="text-xs text-gray-400">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title/Caption */}
          <div>
            <label htmlFor="title" className="block text-sm text-gray-400 mb-2">
              Caption (optional)
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-dark border border-gray-medium rounded-md px-4 py-3 focus:outline-none focus:border-white"
              placeholder="Add a caption... #hashtags work too"
              maxLength={200}
            />
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-sm text-gray-400 mb-2">
              {contentType === "image" ? "Image URL or Base64" : "Content"}
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-64 bg-gray-dark border border-gray-medium rounded-md px-4 py-3 focus:outline-none focus:border-white font-mono text-sm resize-none"
              placeholder={getPlaceholder()}
              required
            />
            {contentType === "image" && (
              <p className="mt-1 text-xs text-gray-500">
                Paste an image URL (https://...) or a base64 data URI (data:image/png;base64,...)
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="w-full py-4 bg-accent-pink text-white font-bold rounded-md hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </form>
      )}

      <BottomNav />
    </main>
  )
}
