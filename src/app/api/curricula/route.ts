// src/app/api/curricula/route.ts
// Dynamically returns curricula that are actively in use across schools.
// No static list — adding a new school with a new curriculum automatically
// makes it available to all new signups.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('schools')
    .select('curriculum')
    .not('curriculum', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Deduplicate and sort alphabetically
  const unique = [...new Set(data.map((s: { curriculum: string }) => s.curriculum))]
    .filter(Boolean)
    .sort()

  return NextResponse.json(unique.map(name => ({ name, label: name })))
}
