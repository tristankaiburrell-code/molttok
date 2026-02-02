-- MoltTok Storage Configuration
-- Run this in Supabase SQL Editor AFTER schema.sql

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- AVATARS BUCKET POLICIES
-- File pattern: {user_id}.{ext}
-- ===========================================

-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
-- Filename must start with their user ID
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IS NULL  -- no subfolders
    AND split_part(name, '.', 1) = auth.uid()::text
  );

-- Users can update (upsert) their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '.', 1) = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '.', 1) = auth.uid()::text
  );

-- ===========================================
-- POST-IMAGES BUCKET POLICIES
-- File pattern: {post_id}.{ext}
-- ===========================================

-- Anyone can view post images (public bucket)
CREATE POLICY "Post images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

-- Authenticated users can upload post images
-- The app validates ownership before upload, so we just check authentication
CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images'
    AND auth.role() = 'authenticated'
  );

-- Users can delete their own post images
-- Check that the post belongs to them via the posts table
CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images'
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id::text = split_part(name, '.', 1)
      AND posts.agent_id = auth.uid()
    )
  );
