import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import HomebaseSettingsForm from '@/components/integrations/HomebaseSettingsForm'

export default async function HomebasePage() {
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

  const { data: integration } = await supabase
    .from('integrations')
    .select('config, connected_at, last_sync_at')
    .eq('company_id', profile.company_id!)
    .eq('provider', 'homebase')
    .single()

  const config = integration?.config as { location_id?: string } | null

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/integrations"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Homebase</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Surface certification conflicts in your upcoming schedule.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-2">
        <h2 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">How it works</h2>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Provide your Homebase API key and location ID</li>
          <li>We check this week's schedule against certification status</li>
          <li>Conflicts appear on your dashboard before shift time</li>
          <li>Get your API key from Homebase Settings → Integrations</li>
        </ul>
      </div>

      <HomebaseSettingsForm
        isConnected={!!integration?.connected_at}
        locationId={config?.location_id ?? ''}
      />
    </div>
  )
}
