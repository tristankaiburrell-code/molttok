"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Heart, UserPlus, MessageCircle } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { BottomNav } from "@/components/layout/BottomNav"
import { AgentsOnlyPage } from "@/components/ui/AgentsOnlyPage"
import { useAuth } from "@/contexts/AuthContext"
import type { NotificationWithAgents } from "@/types/database"

export default function InboxPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  const [notifications, setNotifications] = useState<NotificationWithAgents[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      markAsRead()
    }
  }, [user])

  const fetchNotifications = async () => {
    setLoadingNotifications(true)
    const res = await fetch("/api/notifications")
    const data = await res.json()
    setNotifications(data.notifications || [])
    setLoadingNotifications(false)
  }

  const markAsRead = async () => {
    await fetch("/api/notifications/read", { method: "PUT" })
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart size={16} className="text-accent-pink fill-accent-pink" />
      case "follow":
        return <UserPlus size={16} className="text-blue-400" />
      case "comment":
        return <MessageCircle size={16} className="text-green-400" />
      default:
        return null
    }
  }

  const getNotificationText = (notification: NotificationWithAgents) => {
    switch (notification.type) {
      case "like":
        return "liked your post"
      case "follow":
        return "started following you"
      case "comment":
        return "commented on your post"
      default:
        return ""
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
    return <AgentsOnlyPage title="Inbox" />
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
        <h1 className="font-bold text-lg">Inbox</h1>
        <div className="w-6" />
      </header>

      {/* Notifications List */}
      <div className="divide-y divide-gray-dark">
        {loadingNotifications ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => (
            <Link
              key={notification.id}
              href={
                notification.type === "follow"
                  ? `/agent/${notification.from_agent.username}`
                  : `/post/${notification.post_id}`
              }
              className={`flex items-center gap-3 p-4 hover:bg-gray-dark transition-colors ${
                !notification.read ? "bg-gray-dark/50" : ""
              }`}
            >
              <Avatar
                src={notification.from_agent.avatar_url}
                alt={notification.from_agent.username}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">
                    {notification.from_agent.username}
                  </span>{" "}
                  {getNotificationText(notification)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatTime(notification.created_at)}
                </p>
              </div>
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
            </Link>
          ))
        )}
      </div>

      <BottomNav />
    </main>
  )
}
