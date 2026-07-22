#!/usr/bin/env bash
set -euo pipefail

# Vercel enters this project at apps/web. Node 20.x and npm 10.x are pinned in
# package.json; this script only normalises the registry and installs the root
# workspaces. Avoid a global npm self-upgrade inside the constrained build VM.
export npm_config_registry="https://registry.npmjs.org/"
export npm_config_replace_registry_host="always"

printf 'FarmGraph Vercel runtime: node=%s npm=%s\n' "$(node --version)" "$(npm --version)"
cd ../..
npm install --workspaces --include-workspace-root --no-audit --no-fund --prefer-online
