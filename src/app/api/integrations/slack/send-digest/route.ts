import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDigest } from '@/lib/integrations/slack'

export async function POST() {
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

    // Load Slack integration
    const { data: integration } = await supabase
      .from('integrations')
      .select('access_token, config')
      .eq('company_id', profile.company_id)
      .eq('provider', 'slack')
      .single()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    const config = integration.config as { channel_id?: string | null }
    if (!config.channel_id) {
      return NextResponse.json({ error: 'No Slack channel configured. Set a channel in Slack settings.' }, { status: 400 })
    }

    // Load health data
    const { data: healthRows } = await supabase
      .from('v_company_health')
      .select('*')

    const health = healthRows?.[0]
    if (!health) return NextResponse.json({ error: 'No health data available' }, { status: 500 })

    // Load expiry risk (7d window)
    const { data: expiryItems } = await supabase
      .from('v_expiry_risk')
      .select('employee_name, employee_email, role_name, days_until_expiry, expiry_window')
      .eq('company_id', profile.company_id)
      .eq('expiry_window', '7d')
      .order('days_until_expiry', { ascending: true })

    await sendDigest(
      integration.access_token,
      config.channel_id,
      {
        health_score: health.health_score,
        health_grade: health.health_grade,
        covered_roles: health.covered_roles,
        total_roles: health.total_roles,
        drifted_count: health.drifted_count,
        expiring_critical_count: health.expiring_critical_count,
        total_certified: health.total_certified,
      },
      expiryItems ?? []
    )

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
