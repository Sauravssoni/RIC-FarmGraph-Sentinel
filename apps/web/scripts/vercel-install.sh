#!/usr/bin/env bash
set -euo pipefail

# Vercel currently enters this project at apps/web. Pin the npm runtime before
# installing the repository workspaces and replace stale/custom registry hosts
# from the committed lockfile with the public npm registry.
export npm_config_registry="https://registry.npmjs.org/"
export npm_config_replace_registry_host="always"

npm install --global npm@10.8.2 --no-audit --no-fund
cd ../..
npm install --workspaces --include-workspace-root --no-audit --no-fund --prefer-online
