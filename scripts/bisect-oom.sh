#!/usr/bin/env bash
# Binary-search the minimum file size (bytes) that causes Vite ?raw OOM
# under a 2 GB Node.js heap constraint.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_ROOT/scripts/bisect-logs"
mkdir -p "$LOG_DIR"

# ---- tuneable knobs -------------------------------------------------------
MAX_HEAP_MB=2048          # --max-old-space-size value
LOW=0                     # bytes (definitely passes)
HIGH=104857600            # bytes = 100 MiB (already observed OOM)
PRECISION=1048576         # stop when interval < 1 MiB
# ---------------------------------------------------------------------------

MiB() { awk "BEGIN{printf \"%.2f\", $1/1048576}"; }

echo "=== OOM bisect start  [heap cap: ${MAX_HEAP_MB} MB] ==="
echo "    range: ${LOW} – ${HIGH} bytes  |  precision: ${PRECISION} bytes"
echo

attempt=0

while (( HIGH - LOW > PRECISION )); do
  MID=$(( (LOW + HIGH) / 2 ))
  attempt=$(( attempt + 1 ))
  MIB_VAL=$(MiB $MID)
  echo "── attempt #${attempt}: $MID bytes (~${MIB_VAL} MiB) ──"

  # 1. Generate the asset at the probe size.
  FILE_SIZE_BYTES=$MID node "$REPO_ROOT/scripts/generate-random-file.mjs"

  # 2. Wipe previous build artifacts so Vite doesn't use stale cache.
  rm -rf "$REPO_ROOT/.nuxt" "$REPO_ROOT/dist" "$REPO_ROOT/.output"

  # 3. Run the build; cap heap; capture log; tolerate non-zero exit.
  LOG="$LOG_DIR/attempt-${attempt}-${MID}.log"
  EXIT_CODE=0
  NODE_OPTIONS="--max-old-space-size=${MAX_HEAP_MB}" \
    pnpm --dir "$REPO_ROOT" build >"$LOG" 2>&1 || EXIT_CODE=$?

  # 4. OOM detection: either fatal-error string or a non-zero exit.
  if grep -q "heap out of memory\|FATAL ERROR\|Ineffective mark-compacts" "$LOG" \
       || (( EXIT_CODE != 0 )); then
    echo "    → OOM  (exit $EXIT_CODE)  — log: $LOG"
    HIGH=$MID
  else
    echo "    → OK   (exit 0)           — log: $LOG"
    LOW=$MID
  fi
  echo
done

echo "=== Result ==="
LOW_MIB=$(MiB $LOW)
HIGH_MIB=$(MiB $HIGH)
echo "  OOM threshold: between $LOW bytes (${LOW_MIB} MiB) and $HIGH bytes (${HIGH_MIB} MiB)"
echo "  The build OOMs at ~${HIGH_MIB} MiB with a ${MAX_HEAP_MB} MB heap cap."
