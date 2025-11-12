
#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:3000}"
echo "→ Version"
curl -s "$BASE/api/version" | sed 's/.*/  &/'
echo "→ Diagnostics"
curl -s "$BASE/api/diag" | sed 's/.*/  &/'
echo "→ Self-test"
curl -s "$BASE/api/selftest" | sed 's/.*/  &/'
echo "→ Ping"
curl -s "$BASE/api/ping" | sed 's/.*/  &/'
echo "✓ Smoke tests done"
