#!/bin/sh
# Runs all headless tests. Usage: sh tests/run-all.sh
set -e
cd "$(dirname "$0")"
for t in campaign-sim battle-sim battle-render; do
  echo "== $t"
  timeout 120 node "$t.test.js"
done
echo "ALL OK"
