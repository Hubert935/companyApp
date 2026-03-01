import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BundleEditor from '@/components/bundles/BundleEditor'

export default async function NewBundlePage() {
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

  const availableSOPs = (rawSOPs ?? []) as { id: string; title: string; description: string | null }[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Bundle</h1>
        <p className="text-sm text-gray-500 mt-1">Group SOPs for bulk assignment</p>
      </div>
      <BundleEditor
        companyId={profile.company_id}
        userId={user.id}
        availableSOPs={availableSOPs}
      />
    </div>
  )
}
