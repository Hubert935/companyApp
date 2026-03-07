import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import SlackSettingsForm from '@/components/integrations/SlackSettingsForm'

export default async function SlackPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
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
    .select('access_token, config, connected_at, last_sync_at')
    .eq('company_id', profile.company_id!)
    .eq('provider', 'slack')
    .single()

  const { connected, error: errorParam } = await searchParams
  const isConnected = !!integration?.connected_at
  const config = integration?.config as { team_name?: string; channel_id?: string | null } | null

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Slack</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Deliver a weekly ops digest to your team channel.
          </p>
        </div>
      </div>

      {connected === 'true' && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          Slack connected successfully! Set a channel below to start receiving digests.
        </div>
      )}

      {errorParam && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          Error: {decodeURIComponent(errorParam)}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-2">
        <h2 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">What you get</h2>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Weekly digest posted every Monday with health score</li>
          <li>Top 5 expiring certifications with urgency indicators</li>
          <li>Role coverage summary and drift alerts</li>
          <li>Send on-demand anytime with the "Send now" button</li>
        </ul>
      </div>

      <SlackSettingsForm
        isConnected={isConnected}
        teamName={config?.team_name ?? null}
        channelId={config?.channel_id ?? null}
      />
    </div>
  )
}
