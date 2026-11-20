#!/bin/sh
# Runs all headless tests. Usage: sh tests/run-all.sh   (CAMPAIGNS=20 RUNS=5 for a quick run)
set -e
cd "$(dirname "$0")"
for t in saves render battle campaign; do
  echo "== $t"
  timeout 600 node "$t.test.js"
done
echo "ALL OK"
