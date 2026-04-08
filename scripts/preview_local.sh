#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-4000}"

echo "Starting local preview for Tech Treehouse..."
echo "Project: $ROOT_DIR"
echo "URL: http://$HOST:$PORT"

if command -v bundle >/dev/null 2>&1; then
  exec bundle exec jekyll serve --livereload --host "$HOST" --port "$PORT"
fi

cat <<EOF
Bundler is not available on this machine yet.

Quick fix:
  gem install bundler
  bundle install
  ./scripts/preview_local.sh

Alternative with Docker:
  docker compose up

EOF
exit 1
