#!/bin/sh
# Save secrets on the cookto-day Worker from this laptop, without a value
# touching the repo, the shell history, the screen or a chat.
#
#   sh apps/api/scripts/secret.sh
#
# The first run makes ~/.config/cookto.day/secrets.env with one blank line
# per secret. Fill in the ones you have, run it again: each filled line is
# checked for shape, saved with `wrangler secret put`, and then blanked in
# the file, so the laptop keeps no copy. Lines left blank are skipped.
# Write `random` as the value and the script makes a 64-character one.
#
# Needs `bunx wrangler@4.147.0 login` once (the deploy token stays in GitHub).
# Wrangler deploys a new version of the Worker for each secret, keeping the
# code and the site's files; the script checks the site after. The runbooks
# in docs/runbooks/ say where each value comes from. ADR 0025 and 0028: a
# secret lives only in Cloudflare.
set -eu

WRANGLER="wrangler@4.147.0" # the same pin as .github/workflows/deploy.yml
WEB="$(cd "$(dirname "$0")/../../web" && pwd)"
FILE="$HOME/.config/cookto.day/secrets.env"
NAMES="TELEGRAM_BOT_TOKEN TELEGRAM_WEBHOOK_SECRET SUPABASE_URL SUPABASE_ANON_KEY GEMINI_API_KEY"

blank_file() {
  mkdir -p "$(dirname "$FILE")"
  {
    echo "# cookto.day Worker secrets. Fill in what you have, then run:"
    echo "#   sh apps/api/scripts/secret.sh"
    echo "# Each filled line is saved to Cloudflare and blanked here."
    echo "# 'random' as a value makes one. docs/runbooks/ say where values come from."
    for n in $NAMES; do echo "$n="; done
  } >"$FILE"
  chmod 600 "$FILE"
}

# Does the value look like what it should? A wrong paste stops here,
# before anything leaves the laptop.
looks_right() {
  case "$1" in
    TELEGRAM_BOT_TOKEN) printf '%s' "$2" | grep -Eq '^[0-9]{6,12}:[A-Za-z0-9_-]{30,}$' ;;
    TELEGRAM_WEBHOOK_SECRET) printf '%s' "$2" | grep -Eq '^[A-Za-z0-9_-]{32,256}$' ;;
    SUPABASE_URL) printf '%s' "$2" | grep -Eq '^https://[a-z0-9]{15,25}\.supabase\.co$' ;;
    SUPABASE_ANON_KEY) printf '%s' "$2" | grep -Eq '^(eyJ[A-Za-z0-9_.-]{40,}|sb_publishable_[A-Za-z0-9_-]{10,})$' ;;
    # Since mid-2026 AI Studio makes "AQ." keys; the older ones start "AIza".
    GEMINI_API_KEY) printf '%s' "$2" | grep -Eq '^(AQ\.[A-Za-z0-9_.-]{20,}|AIza[A-Za-z0-9_-]{30,})$' ;;
    *) false ;;
  esac
}

if [ ! -f "$FILE" ]; then
  blank_file
  echo "Made $FILE"
  echo "Open it, fill in the values you have, save, and run this again."
  exit 0
fi

# The value after NAME=, minus quotes, spaces and line breaks a copy brings.
value_of() {
  grep "^$1=" "$FILE" | head -1 | cut -d= -f2- | tr -d '[:space:]"'"'"
}

# Check every filled line first, so a wrong one stops the run before any
# value leaves the laptop and the file still holds what you typed.
for name in $NAMES; do
  value=$(value_of "$name")
  [ -z "$value" ] || [ "$value" = "random" ] && continue
  if ! looks_right "$name" "$value"; then
    echo "$name doesn't look right. Nothing was saved; the file is unchanged." >&2
    echo "Check what you copied (the runbook says where it comes from) and run again." >&2
    exit 1
  fi
done

saved=0
for name in $NAMES; do
  value=$(value_of "$name")
  [ -z "$value" ] && continue
  if [ "$value" = "random" ]; then
    value=$(openssl rand -hex 32)
    echo "$name: made a random 64-character value."
  fi
  echo "Saving $name on the cookto-day Worker..."
  printf '%s' "$value" | (cd "$WEB" && bunx "$WRANGLER" secret put "$name")
  saved=$((saved + 1))
done
unset value

if [ "$saved" -eq 0 ]; then
  echo "Every line in $FILE is blank. Fill in a value and run again."
  exit 0
fi

# The laptop keeps no copy: the file goes back to blank lines.
blank_file
echo "Blanked $FILE again."

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
