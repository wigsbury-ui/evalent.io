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

  const [
    { data: school },
    { data: submissions },
    { data: users },
    { data: auditLog },
  ] = await Promise.all([
    supabase.from('schools').select('*').eq('id', id).single(),
    supabase.from('submissions').select('id, student_id, overall_academic_pct, recommendation_band, processing_status, created_at').eq('school_id', id).order('created_at', { ascending: false }),
    supabase.from('users').select('id, name, email, role, created_at, last_sign_in_at').eq('school_id', id),
    supabase.from('audit_log').select('id, action, actor_email, created_at, details').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
  ])

  const recCounts: Record<string, number> = {}
  for (const s of submissions || []) {
    if (s.recommendation_band) {
      const key = s.recommendation_band.toLowerCase().includes('ready to admit') ? 'Ready to admit'
        : s.recommendation_band.toLowerCase().includes('borderline') ? 'Borderline'
        : s.recommendation_band.toLowerCase().includes('not yet') ? 'Not yet ready'
        : s.recommendation_band
      recCounts[key] = (recCounts[key] || 0) + 1
    }
  }

  const scoredSubmissions = (submissions || []).filter(s => s.overall_academic_pct != null)
  const avgScore = scoredSubmissions.length > 0
    ? scoredSubmissions.reduce((sum, s) => sum + (s.overall_academic_pct || 0), 0) / scoredSubmissions.length
    : null

  return NextResponse.json({
    school,
    stats: {
      total_students: 0,
      total_submissions: submissions?.length || 0,
      scored: scoredSubmissions.length,
      avg_score: avgScore ? Math.round(avgScore * 10) / 10 : null,
      status_counts: {},
      rec_counts: recCounts,
    },
    recent_students: [],
    users: users || [],
    audit_log: auditLog || [],
  })
}
