import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Users, RefreshCw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import GustoActions from '@/components/integrations/GustoActions'

export default async function GustoPage({
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
    .select('connected_at, last_sync_at, config')
    .eq('company_id', profile.company_id!)
    .eq('provider', 'gusto')
    .single()

  const { connected, error: errorParam } = await searchParams
  const isConnected = !!integration?.connected_at

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gusto</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sync your employee roster from Gusto payroll.
          </p>
        </div>
      </div>

      {connected === 'true' && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          Gusto connected successfully!
        </div>
      )}

      {errorParam && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          Error: {decodeURIComponent(errorParam)}
        </div>
      )}

      {/* Status card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isConnected ? 'bg-green-100 dark:bg-green-950 text-green-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
          }`}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {isConnected ? 'Connected to Gusto' : 'Not connected'}
            </p>
            {isConnected && integration?.connected_at && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Connected {new Date(integration.connected_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {isConnected && integration?.last_sync_at && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-4 h-4" />
            Last synced {new Date(integration.last_sync_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-2">
        <h2 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">What syncing does</h2>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Pulls active employees from your Gusto company</li>
          <li>Updates names and phone numbers for existing profiles</li>
          <li>Identifies new hires who aren't in the portal yet</li>
          <li>Terminated employees are automatically excluded</li>
        </ul>
      </div>

      <GustoActions isConnected={isConnected} />
    </div>
  )
}
