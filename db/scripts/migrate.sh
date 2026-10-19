#!/bin/sh
# migrate.sh: the database changes only through here (ADR 0032).
#
#   sh db/scripts/migrate.sh status      what's applied, what's waiting
#   sh db/scripts/migrate.sh up          apply every waiting migration, in order
#   sh db/scripts/migrate.sh down [n]    roll back the latest one, or the last n
#   sh db/scripts/migrate.sh new <name>  write NNNN_<name>.up.sql and .down.sql
#   sh db/scripts/migrate.sh secret      a new Worker secret the functions check
#
# The connection string comes from the macOS keychain (docs/runbooks/database.md)
# or, in CI, from DATABASE_URL. It is never printed. Agents write migrations
# and never run this: they have no connection string.
set -eu

DIR=$(cd "$(dirname "$0")/.." && pwd)
MIGRATIONS="$DIR/migrations"
PSQL=${PSQL:-/opt/homebrew/opt/libpq/bin/psql}
[ -x "$PSQL" ] || PSQL=psql
WRANGLER="wrangler@4.147.0"
WEB="$DIR/../apps/web"

if [ -n "${DATABASE_URL:-}" ]; then
  URL=$DATABASE_URL
else
  URL=$(security find-generic-password -s cookto.day-db -w 2>/dev/null || true)
  if [ -z "$URL" ]; then
    echo "No connection string. Save it once (docs/runbooks/database.md):" >&2
    echo "  security add-generic-password -a cookto.day -s cookto.day-db -w" >&2
    exit 1
  fi
fi

run() {
  PGOPTIONS="-c client_min_messages=warning" "$PSQL" "$URL" -X -q -v ON_ERROR_STOP=1 "$@"
}

ensure() {
  run -c "create table if not exists schema_migrations (
    version int primary key, name text not null,
    applied_at timestamptz not null default now())"
}

applied() { run -At -c "select version from schema_migrations order by version"; }

version_of() { basename "$1" | sed 's/^\([0-9]*\)_.*/\1/' | sed 's/^0*//'; }
name_of() { basename "$1" | sed 's/^[0-9]*_\(.*\)\.\(up\|down\)\.sql$/\1/'; }

is_applied() { applied | grep -qx "$1"; }

cmd=${1:-status}
case "$cmd" in
  status)
    ensure
    for f in "$MIGRATIONS"/*.up.sql; do
      v=$(version_of "$f")
      if is_applied "$v"; then state=applied; else state=waiting; fi
      printf '%s  %s  %s\n' "$(basename "$f" .up.sql)" "$state" ""
    done
    ;;
  up)
    ensure
    n=0
    for f in "$MIGRATIONS"/*.up.sql; do
      v=$(version_of "$f")
      is_applied "$v" && continue
      down="${f%.up.sql}.down.sql"
      [ -f "$down" ] || { echo "$(basename "$f") has no .down.sql; write the rollback first" >&2; exit 1; }
      echo "up: $(basename "$f" .up.sql)"
      run -1 -f "$f" -c "insert into schema_migrations (version, name) values ($v, '$(name_of "$f")')"
      n=$((n + 1))
    done
    echo "$n applied"
    ;;
  down)
    ensure
    count=${2:-1}
    for v in $(applied | sort -rn | head -n "$count"); do
      f=$(ls "$MIGRATIONS"/$(printf '%04d' "$v")_*.down.sql)
      echo "down: $(basename "$f" .down.sql)"
      run -1 -f "$f" -c "delete from schema_migrations where version = $v"
    done
    ;;
  new)
    name=${2:?a name, like messenger_tables}
    last=$(ls "$MIGRATIONS"/*.up.sql 2>/dev/null | tail -n 1)
    next=$(printf '%04d' $(( $( [ -n "$last" ] && version_of "$last" || echo 0 ) + 1 )))
    up="$MIGRATIONS/${next}_${name}.up.sql"
    printf -- '-- #<issue>: what this adds, and why. Every new table turns row-level\n-- security on here (ADR 0032).\n' > "$up"
    printf -- '-- Undoes %s_%s: drop exactly what the up made, in reverse.\n' "$next" "$name" > "${up%.up.sql}.down.sql"
    echo "$up"
    echo "${up%.up.sql}.down.sql"
    ;;
  secret)
    # The value goes to the Worker; only its sha256 goes to the database.
    value=$(openssl rand -hex 32)
    hash=$(printf '%s' "$value" | shasum -a 256 | cut -d' ' -f1)
    run -c "insert into api_secrets (name, hash) values ('messenger', '$hash')
            on conflict (name) do update set hash = excluded.hash"
    printf '%s' "$value" | (cd "$WEB" && bunx "$WRANGLER" secret put MESSENGER_API_SECRET)
    echo "MESSENGER_API_SECRET: saved to the Worker, its hash to the database"
    ;;
  *)
    sed -n '2,10p' "$0" >&2
    exit 1
    ;;
esac
