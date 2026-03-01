import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RoleEditor from '@/components/roles/RoleEditor'
import type { SOP } from '@/types'

export default async function NewRolePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.company_id || !['owner', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const { data: rawSOPs } = await supabase
    .from('sops')
    .select('id, title, description')
    .eq('company_id', profile.company_id)
    .eq('is_archived', false)
    .order('title')

  const availableSOPs = (rawSOPs ?? []) as unknown as Pick<SOP, 'id' | 'title' | 'description'>[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Role</h1>
        <p className="text-sm text-gray-500 mt-1">Define a job function and its required SOPs</p>
      </div>
      <RoleEditor
        companyId={profile.company_id}
        userId={user.id}
        availableSOPs={availableSOPs}
      />
    </div>
  )
}
