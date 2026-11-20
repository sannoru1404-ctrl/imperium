#!/bin/sh
# Runs all headless tests. Usage: sh tests/run-all.sh   (CAMPAIGNS=20 RUNS=5 for a quick run)
set -e
cd "$(dirname "$0")"
for t in boot saves provinces food religion diplo render battle siege war campaign; do
  echo "== $t"
  timeout 600 node "$t.test.js"
done
echo "ALL OK"
