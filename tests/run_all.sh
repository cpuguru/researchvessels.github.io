#!/bin/bash
# Dev-only test runner for the ResearchVessels.org static site. Not part of the site; nothing here is linked from it.
# Needs: python3, node 18+ (global fetch/WebSocket), google-chrome. Usage: bash tests/run_all.sh [tag]
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$HERE")"; TAG=${1:-run}
OUT="$HERE/out"; mkdir -p "$OUT/shots/phase1"
free_port(){ python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()'; }
P1=$(free_port); P2=$(free_port); XSS=$(mktemp -d /tmp/rv_xss_XXXX)
python3 "$HERE/tools/inject_xss_phase2.py" "$XSS/site" >/dev/null && python3 "$HERE/tools/inject_review.py" "$XSS/site" >/dev/null && python3 "$HERE/tools/inject_where.py" "$XSS/site" >/dev/null || { echo "injection failed"; exit 1; }
python3 "$HERE/tools/ghp_server.py" "$ROOT" $P1 & S1=$!
python3 "$HERE/tools/ghp_server.py" "$XSS/site" $P2 & S2=$!
trap 'kill $S1 $S2 2>/dev/null; rm -rf "$XSS"' EXIT
sleep 1; B=http://127.0.0.1:$P1/; X=http://127.0.0.1:$P2/
echo "site $B  xss clone $X" > "$OUT/${TAG}_status.txt"
run(){ name=$1; shift; env "$@" > "$OUT/${TAG}_$name.txt" 2>&1; echo "$name exit $? : $(grep -ahE 'SUMMARY|RESOURCES SMOKE' "$OUT/${TAG}_$name.txt" | tail -1 | cut -c1-400)" >> "$OUT/${TAG}_status.txt"; }
cd "$ROOT"
run where_test BASE=$B XBASE=$X timeout 900 node tests/where_test.mjs
run review_test BASE=$B timeout 1200 node tests/review_test.mjs
run review_xss BASE=$X timeout 900 node tests/review_xss.mjs
run phase2_test BASE=$B timeout 1200 node tests/phase2_test.mjs
run phase2_xss BASE=$X timeout 1500 node tests/phase2_xss.mjs
run phase1_inst BASE=$B timeout 1800 node tests/phase1/inst_test.mjs
run phase1_xss BASE=$X timeout 900 node tests/phase1/xss_test.mjs
run resources_smoke BASE=$B timeout 600 node tests/phase1/resources_smoke.mjs
echo done >> "$OUT/${TAG}_status.txt"; cat "$OUT/${TAG}_status.txt"
