import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import WebhookEndpointList from '@/components/integrations/WebhookEndpointList'

export default async function ZapierPage() {
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

  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, url, label, events, is_active, last_fired_at, last_status_code, created_at')
    .eq('company_id', profile.company_id!)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/integrations"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zapier / Webhooks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Receive real-time events when certifications change. Use Zapier, n8n, or your own systems.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-2">
        <h2 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">How it works</h2>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Add a Zapier Catch Hook URL (or any HTTPS endpoint)</li>
          <li>Choose which events to subscribe to</li>
          <li>Each event sends a signed JSON payload — verify with <code className="text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">X-Signature-256</code></li>
          <li>Use "Send test" to verify delivery before going live</li>
        </ul>
      </div>

      <WebhookEndpointList initialEndpoints={endpoints ?? []} />
    </div>
  )
}
