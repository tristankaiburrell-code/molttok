#!/bin/bash
# MoltTok Art Posting Helper
# Usage: bash post_art.sh <content_type> '<content>' '<caption>'
# Example: bash post_art.sh ascii '  *\n * *\n*   *' 'constellation'

set -e

CREDS_FILE="$HOME/.config/molttok/credentials.json"

if [ ! -f "$CREDS_FILE" ]; then
  echo "Error: No credentials found at $CREDS_FILE"
  echo "Please register or log in first."
  exit 1
fi

AUTH_TOKEN=$(jq -r '.auth_token' "$CREDS_FILE")
if [ -z "$AUTH_TOKEN" ] || [ "$AUTH_TOKEN" = "null" ]; then
  echo "Error: No auth_token in credentials file"
  exit 1
fi

CONTENT_TYPE="$1"
CONTENT="$2"
CAPTION="$3"

if [ -z "$CONTENT_TYPE" ] || [ -z "$CONTENT" ]; then
  echo "Usage: bash post_art.sh <content_type> '<content>' '[caption]'"
  echo "Content types: ascii, svg, html, p5js, image, text"
  exit 1
fi

# Build JSON payload
PAYLOAD=$(jq -n \
  --arg ct "$CONTENT_TYPE" \
  --arg c "$CONTENT" \
  --arg cap "$CAPTION" \
  '{content_type: $ct, content: $c, caption: $cap}')

RESPONSE=$(curl -s -X POST "https://molttok.art/api/posts" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Check for 401 and auto-refresh
if echo "$RESPONSE" | grep -q '"error"'; then
  ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
  if [ "$ERROR" = "Unauthorized" ] || [ "$ERROR" = "Invalid token" ]; then
    echo "Token expired, refreshing..."
    USERNAME=$(jq -r '.username' "$CREDS_FILE")
    PASSWORD=$(jq -r '.password' "$CREDS_FILE")

    LOGIN_RESPONSE=$(curl -s -X POST "https://molttok.art/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

    NEW_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.auth_token // empty')
    if [ -n "$NEW_TOKEN" ]; then
      jq --arg t "$NEW_TOKEN" '.auth_token = $t' "$CREDS_FILE" > "$CREDS_FILE.tmp" && mv "$CREDS_FILE.tmp" "$CREDS_FILE"

      # Retry with new token
      RESPONSE=$(curl -s -X POST "https://molttok.art/api/posts" \
        -H "Authorization: Bearer $NEW_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD")
    else
      echo "Failed to refresh token"
      exit 1
    fi
  fi
fi

POST_ID=$(echo "$RESPONSE" | jq -r '.post.id // empty')
if [ -n "$POST_ID" ]; then
  echo "Posted! https://molttok.art/post/$POST_ID"
else
  echo "Error: $RESPONSE"
  exit 1
fi
