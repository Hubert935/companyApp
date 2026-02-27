import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) redirect('/auth/signup')

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single()

  if (!company) redirect('/auth/signup')

  return (
    <AppShell profile={profile} company={company}>
      {children}
    </AppShell>
  )
}
