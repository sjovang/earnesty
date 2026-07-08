#!/usr/bin/env bash
set -euo pipefail

failed=0
shopt -s nullglob
workflow_files=(.github/workflows/*.yml .github/workflows/*.yaml)
shopt -u nullglob

if [ "${#workflow_files[@]}" -eq 0 ]; then
  echo "No workflow files found under .github/workflows."
  exit 0
fi

for file in "${workflow_files[@]}"; do
  while IFS=: read -r line_no line_text; do
    ref=$(
      printf '%s\n' "$line_text" \
        | sed -E 's/^[[:space:]]*-?[[:space:]]*uses:[[:space:]]*//; s/[[:space:]]+#.*$//; s/^["'"'"'\'']//; s/["'"'"'\'']$//'
    )

    if [[ "$ref" == ./* || "$ref" == docker://* ]]; then
      continue
    fi

    if [[ ! "$ref" =~ @[0-9a-f]{40}$ ]]; then
      printf '%s:%s: action reference must be pinned to a 40-char SHA: %s\n' "$file" "$line_no" "$ref"
      failed=1
    fi
  done < <(grep -nE '^[[:space:]]*-?[[:space:]]*uses:[[:space:]]*[^#[:space:]]+' "$file" || true)
done

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "All third-party GitHub Actions references are SHA-pinned."
