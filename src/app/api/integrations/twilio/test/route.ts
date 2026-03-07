import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSMS } from '@/lib/integrations/twilio'

interface TestBody {
  to: string   // E.164 phone number to send test to
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

    const { to } = await request.json() as TestBody
    if (!to) return NextResponse.json({ error: 'to phone number required' }, { status: 400 })

    // Load stored credentials
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('twilio_account_sid, twilio_auth_token, twilio_from_number')
      .eq('company_id', profile.company_id)
      .single()

    if (!settings?.twilio_account_sid || !settings?.twilio_auth_token || !settings?.twilio_from_number) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 400 })
    }

    const result = await sendSMS(
      {
        accountSid: settings.twilio_account_sid,
        authToken: settings.twilio_auth_token,
        fromNumber: settings.twilio_from_number,
      },
      to,
      '✅ Test message from your CompanyApp workspace — Twilio integration is working!'
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
