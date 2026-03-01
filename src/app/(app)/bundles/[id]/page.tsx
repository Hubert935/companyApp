import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import BundleEditor from '@/components/bundles/BundleEditor'
import type { SOPBundle } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditBundlePage({ params }: Props) {
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

  const [bundleResult, sopsResult] = await Promise.all([
    supabase
      .from('sop_bundles')
      .select('*, bundle_sops(sop_id, position)')
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

  if (!bundleResult.data) notFound()

  type BundleWithSOPIds = SOPBundle & { bundle_sops: { sop_id: string; position: number }[] }
  const bundle = bundleResult.data as unknown as BundleWithSOPIds

  const availableSOPs = (sopsResult.data ?? []) as { id: string; title: string; description: string | null }[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Bundle</h1>
        <p className="text-sm text-gray-500 mt-1">Update SOPs and order</p>
      </div>
      <BundleEditor
        companyId={profile.company_id}
        userId={user.id}
        availableSOPs={availableSOPs}
        initialBundle={bundle}
      />
    </div>
  )
}
