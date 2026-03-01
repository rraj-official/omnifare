#!/usr/bin/env bash
# ─────────────────────────────────────────────────
# OmniFare Phase 1 — Verification Script
# Usage: bash scripts/verify_phase1.sh [BASE_URL]
# ─────────────────────────────────────────────────

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

echo ""
yellow "═══════════════════════════════════════════"
yellow "  OmniFare Phase 1 — Verification"
yellow "═══════════════════════════════════════════"
echo ""

# ── Test 1: Health endpoint ──────────────────────
echo "▶ Test 1: GET /api/geoarb/health"
HEALTH=$(curl -s -w "\n%{http_code}" "$BASE/api/geoarb/health")
HTTP_CODE=$(echo "$HEALTH" | tail -1)
BODY=$(echo "$HEALTH" | sed '$d')

echo "  Status: $HTTP_CODE"
echo "  Body:   $BODY"

if [ "$HTTP_CODE" = "200" ]; then
  green "  ✓ Health check passed"
  PASS=$((PASS + 1))
else
  red "  ✗ Health check failed (expected 200, got $HTTP_CODE)"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── Test 2: Search — missing fields ─────────────
echo "▶ Test 2: POST /api/geoarb/search (missing fields → 400)"
SEARCH_BAD=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE/api/geoarb/search" \
  -H "Content-Type: application/json" \
  -d '{"origin":"DEL"}')
HTTP_CODE=$(echo "$SEARCH_BAD" | tail -1)
BODY=$(echo "$SEARCH_BAD" | sed '$d')

echo "  Status: $HTTP_CODE"
echo "  Body:   $BODY"

if [ "$HTTP_CODE" = "400" ]; then
  green "  ✓ Validation correctly rejected incomplete request"
  PASS=$((PASS + 1))
else
  red "  ✗ Expected 400, got $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── Test 3: Search — valid request (cache miss) ─
echo "▶ Test 3: POST /api/geoarb/search (valid → cache miss)"
SEARCH_OK=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE/api/geoarb/search" \
  -H "Content-Type: application/json" \
  -d '{"origin":"DEL","destination":"BLR","date":"2026-03-17","cabin_class":"economy","passengers":1}')
HTTP_CODE=$(echo "$SEARCH_OK" | tail -1)
BODY=$(echo "$SEARCH_OK" | sed '$d')

echo "  Status: $HTTP_CODE"
echo "  Body:   $BODY"

if [ "$HTTP_CODE" = "200" ]; then
  green "  ✓ Search endpoint responded"
  PASS=$((PASS + 1))
else
  red "  ✗ Expected 200, got $HTTP_CODE"
  FAIL=$((FAIL + 1))
fi
echo ""

# ── Summary ──────────────────────────────────────
yellow "═══════════════════════════════════════════"
echo "  Results: $(green "$PASS passed")  $([ $FAIL -gt 0 ] && red "$FAIL failed" || echo "0 failed")"
yellow "═══════════════════════════════════════════"
echo ""

exit $FAIL
