#!/bin/bash
# PostToolUse hook (Bash). After a `git commit`, stage versioned copies of the app:
#   Risk-Threat-Assessment-Tool-vX.XXX.html          (index.html snapshot)
#   offline-releases/...-vX.XXX-offline.html         (standalone offline build)
# Each version has its own filename, so earlier versions are never overwritten.
CMD=$(jq -r '.tool_input.command')
echo "$CMD" | grep -q 'git commit' || exit 0
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

VERSION=$(grep -o 'VERSION="[^"]*"' index.html 2>/dev/null | head -1 | cut -d'"' -f2)
[ -z "$VERSION" ] && exit 0

DEST="Risk-Threat-Assessment-Tool-v${VERSION}.html"
cp index.html "$DEST" && git add "$DEST" 2>/dev/null || true

# Offline build. The obfuscator is randomised, so rebuilding an existing version
# would dirty the tree on every commit: build each version once, never overwrite.
# A failure here must never block the normal snapshot above.
if [ -f "offline-releases/Risk-Threat-Assessment-Tool-v${VERSION}-offline.html" ]; then
  exit 0
elif [ -d node_modules ] && node build.js >/dev/null 2>&1; then
  OUT="dist-offline/Risk-Threat-Assessment-Tool-v${VERSION}-offline.html"
  if [ -f "$OUT" ]; then
    mkdir -p offline-releases
    cp "$OUT" offline-releases/ && git add "offline-releases/$(basename "$OUT")" 2>/dev/null || true
  fi
else
  echo "offline build skipped (node_modules missing or build failed - run: npm install && npm run build)" >&2
fi
exit 0
