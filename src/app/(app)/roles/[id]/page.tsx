import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import RoleEditor from '@/components/roles/RoleEditor'
import type { SOP, CompanyRole, RoleSOP } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditRolePage({ params }: PageProps) {
  const { id } = await params

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

  const [roleResult, sopsResult] = await Promise.all([
    supabase
      .from('company_roles')
      .select('*, role_sops(sop_id, position)')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single(),

    supabase
      .from('sops')
      .select('id, title, description')
      .eq('company_id', profile.company_id)
      .eq('is_archived', false)
      .order('title'),
  ])

  if (!roleResult.data) notFound()

  const role = roleResult.data as unknown as CompanyRole & { role_sops: RoleSOP[] }
  const availableSOPs = (sopsResult.data ?? []) as unknown as Pick<SOP, 'id' | 'title' | 'description'>[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Role</h1>
        <p className="text-sm text-gray-500 mt-1">{role.name}</p>
      </div>
      <RoleEditor
        companyId={profile.company_id}
        userId={user.id}
        availableSOPs={availableSOPs}
        initialRole={role}
      />
    </div>
  )
}
