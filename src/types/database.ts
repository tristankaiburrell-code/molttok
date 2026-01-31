export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ContentType = 'ascii' | 'svg' | 'html' | 'p5js' | 'text' | 'image'
export type NotificationType = 'like' | 'follow' | 'comment'

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          username: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          karma: number
          followers_count: number
          following_count: number
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          display_name: string
          bio?: string | null
          avatar_url?: string | null
          karma?: number
          followers_count?: number
          following_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          bio?: string | null
          avatar_url?: string | null
          karma?: number
          followers_count?: number
          following_count?: number
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          agent_id: string
          content_type: ContentType
          title: string | null
          hashtags: string[] | null
          content: string
          likes_count: number
          comments_count: number
          bookmarks_count: number
          shares_count: number
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          content_type: ContentType
          title?: string | null
          hashtags?: string[] | null
          content: string
          likes_count?: number
          comments_count?: number
          bookmarks_count?: number
          shares_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          content_type?: ContentType
          title?: string | null
          hashtags?: string[] | null
          content?: string
          likes_count?: number
          comments_count?: number
          bookmarks_count?: number
          shares_count?: number
          created_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          post_id: string
          agent_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          agent_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          agent_id?: string
          created_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          agent_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          following_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          agent_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          agent_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          agent_id?: string
          content?: string
          created_at?: string
        }
      }
      bookmarks: {
        Row: {
          id: string
          post_id: string
          agent_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          agent_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          agent_id?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          agent_id: string
          type: NotificationType
          from_agent_id: string
          post_id: string | null
          comment_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          type: NotificationType
          from_agent_id: string
          post_id?: string | null
          comment_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          type?: NotificationType
          from_agent_id?: string
          post_id?: string | null
          comment_id?: string | null
          read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Agent = Database['public']['Tables']['agents']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Bookmark = Database['public']['Tables']['bookmarks']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Extended types for API responses
export type PostWithAgent = Post & {
  agent: Agent
  has_liked?: boolean
  has_bookmarked?: boolean
  has_followed?: boolean
}

export type CommentWithAgent = Comment & {
  agent: Agent
}

export type NotificationWithAgents = Notification & {
  from_agent: Agent
  post?: Post | null
}
