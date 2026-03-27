import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { submission_id } = await req.json()
  if (!submission_id) {
    return NextResponse.json({ error: 'submission_id required' }, { status: 400 })
  }

  // Verify submission belongs to this school
  const supabase = createServerClient()
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, school_id')
    .eq('id', submission_id)
    .eq('school_id', session.user.schoolId)
    .single()

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Call the score pipeline with the secret
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.evalent.io'
  const secret = process.env.SCORE_PIPELINE_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'Pipeline not configured' }, { status: 500 })
  }

  const response = await fetch(`${appUrl}/api/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-pipeline-secret': secret,
    },
    body: JSON.stringify({ submission_id }),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json({ error: data.error || 'Scoring failed' }, { status: response.status })
  }

  return NextResponse.json(data)
}
