import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MessageSquare, Webhook, Users, Calendar, Hash } from 'lucide-react'
import Link from 'next/link'

interface Integration {
  id: string
  company_id: string
  provider: 'gusto' | 'homebase' | 'slack'
  connected_at: string | null
  last_sync_at: string | null
}

interface IntegrationCardProps {
  href: string
  icon: React.ReactNode
  name: string
  description: string
  connected: boolean
  lastSync?: string | null
}

function IntegrationCard({ href, icon, name, description, connected, lastSync }: IntegrationCardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-4 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {icon}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          connected
            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      {connected && lastSync && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Last synced {new Date(lastSync).toLocaleDateString()}
        </p>
      )}

      <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
        Configure →
      </span>
    </Link>
  )
}

export default async function IntegrationsPage() {
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

  // Fetch existing integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('*')

  // Fetch notification settings (Twilio)
  const { data: notifSettings } = await supabase
    .from('notification_settings')
    .select('id, twilio_account_sid')
    .single()

  const intMap = new Map<string, Integration>()
  for (const i of integrations ?? []) {
    intMap.set(i.provider, i as Integration)
  }

  const twilioConnected = !!(notifSettings?.twilio_account_sid)
  const gustoRow = intMap.get('gusto')
  const homebaseRow = intMap.get('homebase')
  const slackRow = intMap.get('slack')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Connect your tools to automate notifications, sync employees, and surface certification data where you already work.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <IntegrationCard
          href="/integrations/twilio"
          icon={<MessageSquare className="w-6 h-6" />}
          name="Twilio SMS"
          description="Send automatic SMS alerts when certifications expire or employees complete training."
          connected={twilioConnected}
        />

        <IntegrationCard
          href="/integrations/zapier"
          icon={<Webhook className="w-6 h-6" />}
          name="Zapier / Webhooks"
          description="Fire real-time webhooks on cert events to connect with any tool via Zapier or your own systems."
          connected={false}
        />

        <IntegrationCard
          href="/integrations/gusto"
          icon={<Users className="w-6 h-6" />}
          name="Gusto"
          description="Sync your employee roster from Gusto. New hires appear automatically — no manual invites needed."
          connected={!!gustoRow?.connected_at}
          lastSync={gustoRow?.last_sync_at}
        />

        <IntegrationCard
          href="/integrations/homebase"
          icon={<Calendar className="w-6 h-6" />}
          name="Homebase"
          description="Check whether scheduled employees are certified for their shifts. Surface conflicts before they happen."
          connected={!!homebaseRow?.connected_at}
          lastSync={homebaseRow?.last_sync_at}
        />

        <IntegrationCard
          href="/integrations/slack"
          icon={<Hash className="w-6 h-6" />}
          name="Slack"
          description="Deliver a weekly ops digest to your manager channel — health score, expiry alerts, and pending certs."
          connected={!!slackRow?.connected_at}
          lastSync={slackRow?.last_sync_at}
        />
      </div>
    </div>
  )
}
