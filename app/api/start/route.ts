// app/api/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/app/lib/supa'
import { loadBlueprints } from '@/app/lib/sheets'

type Mode = 'easy' | 'core' | 'hard'

function norm(s: unknown) {
  return String(s ?? '')
    .replace(/\uFEFF/g, '')   // BOM
    .replace(/\u00A0/g, ' ')  // nbsp
    .trim()
}

function normKey(s: unknown) {
  return norm(s).toLowerCase()
}

function num(val: unknown) {
  const n = Number(String(val ?? '').replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

async function handle(req: NextRequest) {
  // --- 1) Read inputs (support GET and POST) -------------------------------
  let passcode = ''
  let programme = ''
  let grade = ''
  let mode: Mode = 'core'

  if (req.method === 'GET') {
    const sp = req.nextUrl.searchParams
    passcode = norm(sp.get('passcode'))
    programme = norm(sp.get('programme'))
    grade = norm(sp.get('grade'))
    mode = (norm(sp.get('mode')).toLowerCase() as Mode) || 'core'
  } else if (req.method === 'POST') {
    const body = await req.json().catch(() => ({} as any))
    passcode = norm(body.passcode)
    programme = norm(body.programme)
    grade = norm(body.grade)
    mode = (norm(body.mode).toLowerCase() as Mode) || 'core'
  } else {
    return NextResponse.json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
  }

  if (!programme || !grade) {
    return NextResponse.json({ ok: false, error: 'missing_programme_or_grade' }, { status: 400 })
  }

  const expected = process.env.START_PASSCODE ? norm(process.env.START_PASSCODE) : 'letmein'
  if (!passcode || norm(passcode) !== expected) {
    return NextResponse.json({ ok: false, error: 'bad_passcode' }, { status: 401 })
  }

  // --- 2) Load blueprint rows ---------------------------------------------
  const rows = await loadBlueprints()

  // filter the right programme+grade
  const filtered = rows.filter((r: any) => {
    const rProg =
      r.programme ?? r.Programme ?? r.PROGRAMME ?? r.program ?? r.Program ?? r.PROGRAM
    const rGrade = r.grade ?? r.Grade ?? r.GRADE
    return norm(rProg).toLowerCase() === programme.toLowerCase() && norm(rGrade) === grade
  })

  // --- 3) Build countsBySubject (two schemas supported) --------------------
  const countsBySubject: Record<string, number> = {}

  for (const r of filtered) {
    // subject column can be "subject" or "domains"
    const subjectKey =
      Object.keys(r).find((k) => normKey(k) === 'subject') ??
      Object.keys(r).find((k) => normKey(k) === 'domains')

    if (!subjectKey) continue
    const subject = norm(r[subjectKey])
    if (!subject) continue

    // primary: <mode>_count; fallback: total
    const modeKey = Object.keys(r).find((k) => normKey(k) === `${mode}_count`)
    const totalKey = Object.keys(r).find((k) => normKey(k) === 'total')
    const raw = modeKey ? r[modeKey] : totalKey ? r[totalKey] : undefined
    const n = num(raw)

    if (n > 0) countsBySubject[subject] = n
  }

  if (!Object.values(countsBySubject).some((v) => v > 0)) {
    return NextResponse.json(
      { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
      { status: 400 }
    )
  }

  // --- 4) Create a session -------------------------------------------------
  const token = crypto.randomUUID()

  const plan = {
    programme,
    grade,
    mode,
    countsBySubject, // { English: 4, Mathematics: 4, Reasoning: 4 } etc.
  }

  const { error: insErr } = await supaAdmin()
    .from('sessions')
    .insert({
      token,
      item_index: 0,
      status: 'active',
      plan,
      meta: { programme, grade, mode, t: Date.now() },
    })

  if (insErr) {
    return NextResponse.json({ ok: false, error: 'db_insert_failed', detail: insErr.message }, { status: 500 })
  }

  const start_url = `/t/${token}`
  return NextResponse.json({ ok: true, token, start_url })
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
