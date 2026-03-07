import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendDigest } from '@/lib/integrations/slack'

/**
 * GET /api/integrations/cron/slack-digest
 *
 * Protected by Authorization: Bearer <CRON_SECRET>
 * Call weekly (e.g. every Monday 9am) from Vercel Cron or any scheduler.
 *
 * Iterates all companies with Slack connected + a channel configured,
 * fetches their health + expiry data, and posts the weekly digest.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()

  // All companies with Slack connected
  const { data: slackIntegrations } = await service
    .from('integrations')
    .select('company_id, access_token, config')
    .eq('provider', 'slack')

  if (!slackIntegrations?.length) {
    return NextResponse.json({ message: 'No Slack integrations configured', sent: 0 })
  }

  let sent = 0
  let failed = 0

  for (const integration of slackIntegrations) {
    if (!integration.access_token) continue
    const config = integration.config as { channel_id?: string | null }
    if (!config.channel_id) continue

    try {
      // Health data for this company
      const { data: healthRows } = await service
        .from('v_company_health')
        .select('*')

      const health = healthRows?.[0]
      if (!health) continue

      // Expiry items
      const { data: expiryItems } = await service
        .from('v_expiry_risk')
        .select('employee_name, employee_email, role_name, days_until_expiry, expiry_window')
        .eq('company_id', integration.company_id)
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

      // Log the digest in notification_log
      await service.from('notification_log').insert({
        company_id: integration.company_id,
        channel: 'slack',
        recipient: config.channel_id,
        message: 'Weekly ops digest',
        event_type: 'weekly_digest',
        status: 'sent',
      })

      sent++
    } catch (err) {
      console.error(`[slack-digest] Failed for company ${integration.company_id}:`, err)
      await service.from('notification_log').insert({
        company_id: integration.company_id,
        channel: 'slack',
        recipient: config.channel_id ?? 'unknown',
        message: 'Weekly ops digest',
        event_type: 'weekly_digest',
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      failed++
    }
  }

  return NextResponse.json({ message: 'Slack digest cron complete', sent, failed })
}
