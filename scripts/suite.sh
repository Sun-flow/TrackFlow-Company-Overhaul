#!/usr/bin/env bash
# The suite: every check a change passes before it merges (memory-bank/context.md, Commands).
# Usage: scripts/suite.sh [--no-browser]
#   --no-browser skips the browser check, for CI, which has no browser set up for it.
# Run from anywhere in the repo. Needs Node with pnpm 10, Python 3 and git; the browser check also
# needs `pip3 install -r scripts/requirements.txt`.
set -euo pipefail

browser=1
for arg in "$@"; do
  case "$arg" in
    --no-browser) browser=0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"

echo "== Form tests"
(cd uis/website && pnpm test)

echo "== Stylesheet matches its source"
[ -d uis/website/node_modules ] || (cd uis/website && pnpm install --frozen-lockfile)
before=$(git hash-object uis/website/dist/styles.css)
(cd uis/website && pnpm build)
if [ "$before" != "$(git hash-object uis/website/dist/styles.css)" ]; then
  echo "FAIL  uis/website/dist/styles.css was stale. The fresh build is now in place: commit it." >&2
  exit 1
fi

echo "== Briefs unchanged"
python3 scripts/check-briefs.py "origin/${BASE_REF:-production}"

echo "== The memory bank check's own tests"
python3 scripts/test_check.py
python3 scripts/test_check_briefs.py

if [ "$browser" = 1 ]; then
  echo "== Every page in a browser"
  # Cloud sessions carry their own Chromium (Gotchas in memory-bank/notes.md).
  if [ -z "${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-}" ] && [ -x /opt/pw-browsers/chromium ]; then
    export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium
  fi
  python3 scripts/site-check.py
fi

echo "== Memory bank"
python3 scripts/check-memory.py

echo "Suite passed."
