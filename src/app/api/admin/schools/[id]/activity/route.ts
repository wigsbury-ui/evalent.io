import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const { id } = params

  // Fetch school, users and audit log (these work fine)
  const [
    { data: school },
    { data: users },
    { data: auditLog },
  ] = await Promise.all([
    supabase.from('schools').select('*').eq('id', id).single(),
    supabase.from('users').select('id, name, email, role, created_at, last_sign_in_at').eq('school_id', id),
    supabase.from('audit_log').select('id, action, actor_email, created_at, details').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
  ])

  // Use the dashboard API with schoolId override — this bypasses RLS via the session
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.evalent.io'
  const dashRes = await fetch(`${baseUrl}/api/school/dashboard?schoolId=${id}`, {
    headers: { cookie: req.headers.get('cookie') || '' }
  })
  
  let pipeline: any[] = []
  let submissions: any[] = []
  
  if (dashRes.ok) {
    const dash = await dashRes.json()
    pipeline = dash.pipeline || []
    // Extract submissions from pipeline students
    submissions = pipeline
      .filter((s: any) => s.submission)
      .map((s: any) => s.submission)
  }

  const statusCounts: Record<string, number> = {}
  for (const s of pipeline) {
    statusCounts[s.pipeline_status] = (statusCounts[s.pipeline_status] || 0) + 1
  }

  const recCounts: Record<string, number> = {}
  for (const s of submissions) {
    if (s.recommendation_band) {
      const key = s.recommendation_band.toLowerCase().includes('ready to admit') ? 'Ready to admit'
        : s.recommendation_band.toLowerCase().includes('borderline') ? 'Borderline'
        : s.recommendation_band.toLowerCase().includes('not yet') ? 'Not yet ready'
        : s.recommendation_band
      recCounts[key] = (recCounts[key] || 0) + 1
    }
  }

  const scoredSubmissions = submissions.filter((s: any) => s.overall_academic_pct != null)
  const avgScore = scoredSubmissions.length > 0
    ? scoredSubmissions.reduce((sum: number, s: any) => sum + (s.overall_academic_pct || 0), 0) / scoredSubmissions.length
    : null

  const recentStudents = pipeline.slice(0, 10).map((s: any) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    grade_applied: s.grade_applied,
    pipeline_status: s.pipeline_status,
    created_at: s.created_at,
    admission_term: s.admission_term,
    admission_year: s.admission_year,
    submission: s.submission || null,
  }))

  return NextResponse.json({
    school,
    stats: {
      total_students: pipeline.length,
      total_submissions: submissions.length,
      scored: scoredSubmissions.length,
      avg_score: avgScore ? Math.round(avgScore * 10) / 10 : null,
      status_counts: statusCounts,
      rec_counts: recCounts,
    },
    recent_students: recentStudents,
    users: users || [],
    audit_log: auditLog || [],
  })
}
