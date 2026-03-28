import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS for admin deletions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const { data: school, error } = await supabase
    .from('schools')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json(school)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  try {
    // Delete in order to respect FK constraints
    await supabase.from('audit_log').delete().eq('entity_id', id)
    await supabase.from('report_tokens')
      .delete()
      .in('submission_id',
        (await supabase.from('submissions').select('id').eq('school_id', id)).data?.map(s => s.id) ?? []
      )
    await supabase.from('submissions').delete().eq('school_id', id)
    await supabase.from('students').delete().eq('school_id', id)
    await supabase.from('grade_configs').delete().eq('school_id', id)
    await supabase.from('users').delete().eq('school_id', id)
    
    const { error } = await supabase.from('schools').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ADMIN DELETE SCHOOL]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const body = await req.json()

  const { error } = await supabase
    .from('schools')
    .update(body)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
