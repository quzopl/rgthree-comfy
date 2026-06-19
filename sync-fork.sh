#!/usr/bin/env bash
# Sync this fork (quzopl/rgthree-comfy) with upstream rgthree/rgthree-comfy while
# keeping our local commits (the lora_config in/out feature).
#
#   upstream = https://github.com/rgthree/rgthree-comfy.git  (read-only)
#   origin   = https://github.com/quzopl/rgthree-comfy.git   (our fork)
#
# Usage:  ./sync-fork.sh
set -e
git fetch upstream
echo "Merging upstream/main into main (our lora_config commit stays on top)…"
if ! git merge --no-edit upstream/main; then
  echo
  echo "⚠ Conflict (likely py/power_lora_loader.py). Resolve it KEEPING the"
  echo "  lora_config additions, then:  git add -A && git commit && git push origin main"
  exit 1
fi
git push origin main
echo "✓ Fork synced with upstream and pushed."
