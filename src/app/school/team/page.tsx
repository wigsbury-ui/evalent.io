'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, UserPlus, Mail, Check, X, Clock } from 'lucide-react'
import { LearnMoreLink } from '@/components/ui/learn-more-link'

interface TeamMember {
  id: string; name: string; email: string; role: string; is_active: boolean; created_at: string
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)

  async function loadMembers() {
    const res = await fetch('/api/school/team')
    if (res.ok) setMembers(await res.json())
    setLoading(false)
  }
  useEffect(() => { loadMembers() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true); setInviteError('')
    const res = await fetch('/api/school/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: inviteName, email: inviteEmail })
    })
    const data = await res.json()
    if (!res.ok) { setInviteError(data.error || 'Failed to send invite'); setInviting(false); return }
    setInviteSent(true); setInviteName(''); setInviteEmail(''); setInviting(false)
    await loadMembers()
    setTimeout(() => { setInviteSent(false); setShowInvite(false) }, 3000)
  }

  async function toggleActive(userId: string, is_active: boolean) {
    await fetch('/api/school/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, is_active })
    })
    await loadMembers()
  }

  const roleLabel = (r: string) => r === 'school_admin' ? 'Administrator' : 'Team Member'
  const roleColor = (r: string) => r === 'school_admin'
    ? 'bg-evalent-50 text-evalent-700 border border-evalent-200'
    : 'bg-gray-50 text-gray-600 border border-gray-200'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="mt-1 text-gray-500">Manage who has access to your school's Evalent account.</p>
          <LearnMoreLink featureId="team" title="Managing Your Team" />
        </div>
        <Button
          onClick={() => { setShowInvite(true); setInviteSent(false); setInviteError('') }}
          className="bg-evalent-700 hover:bg-evalent-600 text-white"
        >
          <UserPlus className="mr-2 h-4 w-4" />Invite team member
        </Button>
      </div>

      {showInvite && (
        <Card className="border-evalent-200">
          <CardHeader>
            <CardTitle className="text-base">Invite a team member</CardTitle>
            <CardDescription>
              They'll receive an email with a link to set their password.
              Team members can register students and monitor progress but cannot change school settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inviteSent ? (
              <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <Check className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-700">Invite sent! They'll receive an email with instructions.</p>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{inviteError}</div>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
                    <input type="text" required value={inviteName} onChange={e => setInviteName(e.target.value)}
                      placeholder="Sarah Ahmed"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                    <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                      placeholder="sarah@school.edu"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={inviting} className="bg-evalent-700 hover:bg-evalent-600 text-white">
                    <Mail className="mr-2 h-4 w-4" />{inviting ? 'Sending invite…' : 'Send invite'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />Team members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-evalent-600 border-t-transparent" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-evalent-50 text-evalent-700 font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor(member.role)}`}>
                          {roleLabel(member.role)}
                        </span>
                        {!member.is_active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                  </div>
                  {member.role !== 'school_admin' && (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => toggleActive(member.id, !member.is_active)}
                      className={member.is_active
                        ? 'text-red-600 border-red-200 hover:bg-red-50'
                        : 'text-green-600 border-green-200 hover:bg-green-50'}
                    >
                      {member.is_active
                        ? <><X className="mr-1 h-3 w-3" />Deactivate</>
                        : <><Check className="mr-1 h-3 w-3" />Activate</>}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Permission levels</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Administrator</p>
              <p className="text-xs text-gray-500 leading-relaxed">Full access — Dashboard, Students, School Settings, Pass Thresholds, Assessors, Billing, and Team management.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Team Member</p>
              <p className="text-xs text-gray-500 leading-relaxed">Operational access — Dashboard and Students only. Can register students, send assessment links, and monitor progress. Cannot change settings.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
