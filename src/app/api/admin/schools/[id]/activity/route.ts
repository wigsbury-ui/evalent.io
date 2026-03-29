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

  // Fetch school, users, and audit log directly
  const [
    { data: school },
    { data: users },
    { data: auditLog },
  ] = await Promise.all([
    supabase.from('schools').select('*').eq('id', id).single(),
    supabase.from('users').select('id, name, email, role, created_at, last_sign_in_at').eq('school_id', id),
    supabase.from('audit_log').select('id, action, actor_email, created_at, details').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
  ])

  // Fetch submissions WITH student data joined — avoids separate students RLS issue
  const { data: submissionsWithStudents } = await supabase
    .from('submissions')
    .select(`
      id,
      student_id,
      overall_academic_pct,
      recommendation_band,
      processing_status,
      created_at,
      students (
        id,
        first_name,
        last_name,
        grade_applied,
        pipeline_status,
        created_at,
        admission_term,
        admission_year
      )
    `)
    .eq('school_id', id)
    .order('created_at', { ascending: false })

  const submissions = submissionsWithStudents || []

  // Extract unique students from the joined data
  const studentsMap = new Map()
  for (const sub of submissions) {
    const st = (sub as any).students
    if (st && !studentsMap.has(st.id)) {
      studentsMap.set(st.id, st)
    }
  }
  const students = Array.from(studentsMap.values())

  // Build status counts from students
  const statusCounts: Record<string, number> = {}
  for (const s of students) {
    statusCounts[s.pipeline_status] = (statusCounts[s.pipeline_status] || 0) + 1
  }

  // Build recommendation counts
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

  const scoredSubmissions = submissions.filter(s => s.overall_academic_pct != null)
  const avgScore = scoredSubmissions.length > 0
    ? scoredSubmissions.reduce((sum, s) => sum + (s.overall_academic_pct || 0), 0) / scoredSubmissions.length
    : null

  // Build recent students with their submission
  const recentStudents = students.slice(0, 10).map(s => ({
    ...s,
    submission: submissions.find(sub => sub.student_id === s.id) || null,
  }))

  return NextResponse.json({
    school,
    stats: {
      total_students: students.length,
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
