'use client'

import { useState } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface InviteFormProps {
  companyId: string
  invitedBy: string
}

export default function InviteForm({ companyId, invitedBy }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'employee' | 'manager'>('employee')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    // Upsert invite record
    const { error: inviteError } = await supabase
      .from('invites')
      .upsert(
        {
          company_id: companyId,
          email: email.trim().toLowerCase(),
          role,
          invited_by: invitedBy,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'company_id,email' }
      )

    if (inviteError) {
      setError(inviteError.message)
      setLoading(false)
      return
    }

    // Send magic link via Supabase (they'll sign up and get auto-joined via invite flow)
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    })

    if (magicError) {
      setError(magicError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setEmail('')
    setLoading(false)

    setTimeout(() => setSuccess(false), 4000)
  }

  return (
    <div className="bg-white dark:bg-blue-900/30 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Invite team member</h2>

      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="employee@yourcompany.com"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'employee' | 'manager')}
          className="px-4 py-3 border border-gray-300 dark:border-gray-700 dark:text-white dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:border-gray-700"
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
        <Button type="submit" disabled={loading}>
          {success ? (
            <>
              <Check className="w-4 h-4" />
              Sent!
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              {loading ? 'Sending…' : 'Send invite'}
            </>
          )}
        </Button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}

      <p className="mt-3 text-xs text-gray-400">
        They&apos;ll receive a magic link to join your workspace. Link expires in 7 days.
      </p>
    </div>
  )
}