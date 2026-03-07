import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

interface SettingsBody {
  twilio_account_sid: string
  twilio_auth_token: string
  twilio_from_number: string
  notify_expiry_7d: boolean
  notify_expired: boolean
  notify_pending_48h: boolean
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id || !['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json() as SettingsBody

    const service = createServiceRoleClient()
    const { error } = await service
      .from('notification_settings')
      .upsert({
        company_id: profile.company_id,
        twilio_account_sid: body.twilio_account_sid || null,
        twilio_auth_token: body.twilio_auth_token || null,
        twilio_from_number: body.twilio_from_number || null,
        notify_expiry_7d: body.notify_expiry_7d ?? true,
        notify_expired: body.notify_expired ?? true,
        notify_pending_48h: body.notify_pending_48h ?? true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id || !['owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('company_id', profile.company_id)
      .single()

    return NextResponse.json({ settings })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
