#!/bin/bash
# Run from your evalent repo root: ~/Downloads/evalent-phase1-complete
# Usage: bash deploy-phase5.sh /path/to/downloaded/phase5/src
set -e

SRC="${1:-./phase5-download/src}"

if [ ! -d "$SRC" ]; then
  echo "❌ Source directory not found: $SRC"
  echo "Usage: bash deploy-phase5.sh /path/to/phase5/src"
  exit 1
fi

echo "🚀 Deploying Evalent Phase 5..."

# Create directories
mkdir -p src/app/api/admin/dashboard
mkdir -p src/app/api/admin/schools
mkdir -p src/app/api/school/dashboard
mkdir -p src/app/api/school/students
mkdir -p src/app/admin/schools/new
mkdir -p src/app/school/students/new

# Copy files (overwrites existing where needed)
cp "$SRC/app/api/admin/dashboard/route.ts" src/app/api/admin/dashboard/
cp "$SRC/app/api/admin/schools/route.ts"   src/app/api/admin/schools/
cp "$SRC/app/api/school/dashboard/route.ts" src/app/api/school/dashboard/
cp "$SRC/app/api/school/students/route.ts"  src/app/api/school/students/
cp "$SRC/app/admin/page.tsx"               src/app/admin/page.tsx
cp "$SRC/app/admin/schools/page.tsx"       src/app/admin/schools/
cp "$SRC/app/admin/schools/new/page.tsx"   src/app/admin/schools/new/
cp "$SRC/app/school/page.tsx"              src/app/school/page.tsx
cp "$SRC/app/school/students/new/page.tsx" src/app/school/students/new/

echo "✅ 9 files deployed"
echo ""
echo "Files added/updated:"
echo "  NEW: src/app/api/admin/dashboard/route.ts    (super admin stats API)"
echo "  NEW: src/app/api/admin/schools/route.ts      (school CRUD API)"
echo "  NEW: src/app/api/school/dashboard/route.ts   (school dashboard API)"
echo "  NEW: src/app/api/school/students/route.ts    (student registration API)"
echo "  UPD: src/app/admin/page.tsx                  (live admin dashboard)"
echo "  NEW: src/app/admin/schools/page.tsx           (schools list)"
echo "  NEW: src/app/admin/schools/new/page.tsx       (create school form)"
echo "  UPD: src/app/school/page.tsx                  (live school dashboard)"
echo "  NEW: src/app/school/students/new/page.tsx     (register student form)"
echo ""
echo "To deploy:"
echo "  git add -A"
echo "  git commit -m 'feat: Phase 5 — super admin, school admin, student registration, live dashboards'"
echo "  git push origin main"
