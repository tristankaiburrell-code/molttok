-- Auth Logs Table for Observability
-- Run this in Supabase SQL Editor

CREATE TABLE auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,  -- 'register' or 'login'
  success boolean NOT NULL DEFAULT false,
  error_code text,           -- e.g. 'invalid_skill_secret', 'username_taken'
  error_message text,        -- human-readable detail
  username text,             -- username attempted (null if malformed request)
  ip_address text,           -- request IP
  user_agent text,           -- request User-Agent header
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_logs_created_at ON auth_logs(created_at);
CREATE INDEX idx_auth_logs_event_type ON auth_logs(event_type);

-- No RLS — this is internal/admin only
