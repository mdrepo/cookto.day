#!/bin/sh
# Save one secret on the cookto-day Worker, from this laptop, without the
# value touching the repo, the shell history, the screen or a chat.
#
#   sh apps/api/scripts/secret.sh TELEGRAM_BOT_TOKEN      # paste it, hidden
#   sh apps/api/scripts/secret.sh TELEGRAM_WEBHOOK_SECRET --random
#
# Needs `bunx wrangler login` done once (the deploy token stays in GitHub).
# Wrangler saves the secret and deploys a new version of the Worker at once,
# keeping the code and the site's files; the script checks the site after.
# The runbooks in docs/runbooks/ say which secrets exist and where each
# value comes from. ADR 0025 and 0028: a secret lives only in Cloudflare.
set -eu

WRANGLER="wrangler@4.147.0" # the same pin as .github/workflows/deploy.yml
WEB="$(cd "$(dirname "$0")/../../web" && pwd)"

name="${1:-}"
mode="${2:-}"
case "$name" in
  TELEGRAM_BOT_TOKEN | TELEGRAM_WEBHOOK_SECRET | SUPABASE_URL | SUPABASE_ANON_KEY | GEMINI_API_KEY) ;;
  *)
    echo "usage: sh apps/api/scripts/secret.sh NAME [--random]" >&2
    echo "NAME: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, SUPABASE_URL," >&2
    echo "      SUPABASE_ANON_KEY or GEMINI_API_KEY" >&2
    exit 2
    ;;
esac

# The value: made up here, or pasted with the screen echo off.
if [ "$mode" = "--random" ]; then
  value=$(openssl rand -hex 32)
  echo "Made a random 64-character value for $name."
else
  printf 'Paste the value for %s, then press Enter (nothing is shown): ' "$name"
  if [ -t 0 ]; then
    stty -echo
    trap 'stty echo' EXIT INT TERM
  fi
  IFS= read -r value
  if [ -t 0 ]; then
    stty echo
    trap - EXIT INT TERM
  fi
  echo
fi
# Trim the spaces and line breaks a copy often brings along.
value=$(printf '%s' "$value" | tr -d '[:space:]')

# Does it look like what it should? A wrong paste stops here, before
# anything leaves the laptop.
ok=yes
case "$name" in
  TELEGRAM_BOT_TOKEN) printf '%s' "$value" | grep -Eq '^[0-9]{6,12}:[A-Za-z0-9_-]{30,}$' || ok=no ;;
  TELEGRAM_WEBHOOK_SECRET) printf '%s' "$value" | grep -Eq '^[A-Za-z0-9_-]{32,256}$' || ok=no ;;
  SUPABASE_URL) printf '%s' "$value" | grep -Eq '^https://[a-z0-9]{15,25}\.supabase\.co$' || ok=no ;;
  SUPABASE_ANON_KEY) printf '%s' "$value" | grep -Eq '^(eyJ[A-Za-z0-9_.-]{40,}|sb_publishable_[A-Za-z0-9_-]{10,})$' || ok=no ;;
  GEMINI_API_KEY) printf '%s' "$value" | grep -Eq '^AIza[A-Za-z0-9_-]{30,}$' || ok=no ;;
esac
if [ "$ok" = no ]; then
  echo "That doesn't look like a $name. Nothing was saved." >&2
  echo "Check what you copied (the runbook says where it comes from) and try again." >&2
  exit 1
fi

echo "Saving $name on the cookto-day Worker..."
printf '%s' "$value" | (cd "$WEB" && bunx "$WRANGLER" secret put "$name")
unset value

echo
echo "Secrets the Worker now has (names only):"
(cd "$WEB" && bunx "$WRANGLER" secret list) | grep -o '"name": *"[A-Z_]*"' | sed 's/"name": *"\(.*\)"/  \1/'

status=$(curl -sS -o /dev/null -w '%{http_code}' https://cookto.day/ || echo "no answer")
if [ "$status" = "200" ]; then
  echo "cookto.day still answers 200. Done."
else
  echo "cookto.day answered $status. Open https://cookto.day on your phone; if it's broken, run the Deploy workflow again from GitHub Actions." >&2
  exit 1
fi
