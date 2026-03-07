import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import TwilioSettingsForm from '@/components/integrations/TwilioSettingsForm'

export default async function TwilioPage() {
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

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('company_id', profile.company_id!)
    .single()

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Twilio SMS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Send automatic SMS notifications for expiring and expired certifications.
          </p>
        </div>
      </div>

      <TwilioSettingsForm initialSettings={settings ?? null} />
    </div>
  )
}
