#!/usr/bin/env bash
# Copy public/ to /var/www/house, which nginx serves as the site root.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dest="${DEPLOY_DIR:-/var/www/house}"

if [[ ! -d "$dest" ]]; then
  if ! mkdir -p "$dest" 2>/dev/null; then
    sudo mkdir -p "$dest"
    sudo chown "$(id -u):$(id -g)" "$dest"
  fi
fi

if [[ ! -w "$dest" ]]; then
  echo "Cannot write to $dest. Create it and give this user ownership." >&2
  exit 1
fi

rsync -a --delete \
  --exclude '.DS_Store' \
  "$root/public/" "$dest/"

echo "Deployed public/ to $dest"
