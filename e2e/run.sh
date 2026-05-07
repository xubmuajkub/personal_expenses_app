#!/usr/bin/env bash
set -euo pipefail

FLOWS_DIR="$(dirname "$0")/flows"

echo "==> Personal Expenses E2E suite"
echo "    Flows directory: ${FLOWS_DIR}"
echo ""

for f in "${FLOWS_DIR}"/*.yaml; do
  echo "==> Running: ${f}"
  maestro test "${f}"
  echo ""
done

echo "==> All flows complete."
