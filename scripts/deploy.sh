#!/usr/bin/env bash
# Copy this checkout to /var/www/house and reload the PM2 process.
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
  --exclude '.git/' \
  --exclude 'test/' \
  --exclude 'logs/' \
  --exclude 'node_modules/' \
  --exclude '.DS_Store' \
  "$root/" "$dest/"

mkdir -p "$dest/logs"

if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload "$dest/ecosystem.config.cjs" --update-env
  pm2 save
else
  echo "Files are in $dest. Install PM2, then run: pm2 start $dest/ecosystem.config.cjs && pm2 save"
fi

echo "Deployed to $dest"
