import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SOPEditor from '@/components/sops/SOPEditor'

export default async function NewSOPPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New SOP</h1>
        <p className="text-sm text-gray-500 mt-1">Document a process step-by-step</p>
      </div>
      <SOPEditor companyId={profile.company_id!} userId={user.id} />
    </div>
  )
}
