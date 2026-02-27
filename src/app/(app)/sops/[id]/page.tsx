import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SOPEditor from '@/components/sops/SOPEditor'
import SOPDetail from '@/components/sops/SOPDetail'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SOPPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const { data: sop } = await supabase
    .from('sops')
    .select('*, steps:sop_steps(*)')
    .eq('id', id)
    .eq('company_id', profile.company_id)
    .single()

  if (!sop) notFound()

  // Sort steps by position
  if (sop.steps) {
    sop.steps.sort((a: { position: number }, b: { position: number }) => a.position - b.position)
  }

  const canEdit = profile.role === 'owner' || profile.role === 'manager'

  if (canEdit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit SOP</h1>
          <p className="text-sm text-gray-500 mt-1">Update steps and content</p>
        </div>
        <SOPEditor
          companyId={profile.company_id!}
          userId={user.id}
          initialSOP={sop}
        />
      </div>
    )
  }

  return <SOPDetail sop={sop} />
}
