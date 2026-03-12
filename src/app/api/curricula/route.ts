// src/app/api/curricula/route.ts
// Returns the curricula supported by the platform.
// This list must stay in sync with src/app/school/config/page.tsx CURRICULUM_OPTIONS.
import { NextResponse } from 'next/server'

const CURRICULUM_OPTIONS = [
  { name: 'IB',          label: 'International Baccalaureate (IB)' },
  { name: 'British',     label: 'British / English National Curriculum' },
  { name: 'American',    label: 'American / Common Core' },
  { name: 'Australian',  label: 'Australian Curriculum (ACARA)' },
  { name: 'NewZealand',  label: 'New Zealand Curriculum (NZC)' },
  { name: 'Other',       label: 'Other / International' },
]

export async function GET() {
  return NextResponse.json(CURRICULUM_OPTIONS)
}
