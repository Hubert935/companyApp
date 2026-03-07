import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendSMS } from '@/lib/integrations/twilio'

/**
 * GET /api/integrations/cron/notify
 *
 * Protected by Authorization: Bearer <CRON_SECRET>
 * Call this daily from Vercel Cron, a GitHub Actions schedule, or any cron service.
 *
 * Sends SMS notifications for:
 *   1. Certifications expiring within 7 days (if notify_expiry_7d)
 *   2. Expired certifications (if notify_expired)
 *   3. Pending-review assignments older than 48h (if notify_pending_48h)
 *
 * Deduplication: skips if a matching (employee_id, role_id, event_type) notification
 * was already sent within the last 24 hours.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceRoleClient()

  // Load all companies with Twilio configured
  const { data: allSettings } = await service
    .from('notification_settings')
    .select('company_id, twilio_account_sid, twilio_auth_token, twilio_from_number, notify_expiry_7d, notify_expired, notify_pending_48h')

  if (!allSettings?.length) {
    return NextResponse.json({ message: 'No companies with Twilio configured', sent: 0 })
  }

  let totalSent = 0
  let totalSkipped = 0

  const now = new Date()
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  for (const settings of allSettings) {
    if (!settings.twilio_account_sid || !settings.twilio_auth_token || !settings.twilio_from_number) {
      continue
    }

    const creds = {
      accountSid: settings.twilio_account_sid,
      authToken: settings.twilio_auth_token,
      fromNumber: settings.twilio_from_number,
    }
    const companyId = settings.company_id

    // ── 1. Expiring within 7 days ────────────────────────────────────────────
    if (settings.notify_expiry_7d) {
      const { data: expiryRisk } = await service
        .from('v_expiry_risk')
        .select('employee_id, role_id, employee_name, employee_email, role_name, expires_at, days_until_expiry')
        .eq('company_id', companyId)
        .eq('expiry_window', '7d')

      for (const row of expiryRisk ?? []) {
        const isDupe = await wasRecentlySent(service, companyId, row.employee_id, row.role_id, 'expiry_7d', cutoff24h)
        if (isDupe) { totalSkipped++; continue }

        // Get phone number
        const phone = await getPhone(service, row.employee_id)
        if (!phone) continue

        const days = Math.ceil(row.days_until_expiry)
        const msg = `⚠️ Reminder: Your ${row.role_name} certification expires in ${days} day${days === 1 ? '' : 's'}. Contact your manager to renew.`

        const result = await sendSMS(creds, phone, msg)
        await logNotification(service, companyId, phone, msg, 'expiry_7d', row.employee_id, row.role_id, result.success, result.error)
        if (result.success) totalSent++
      }
    }

    // ── 2. Already expired ───────────────────────────────────────────────────
    if (settings.notify_expired) {
      const { data: expiredCerts } = await service
        .from('v_cert_status')
        .select('employee_id, role_id, employee_name, employee_email, role_name')
        .eq('company_id', companyId)
        .eq('cert_status', 'expired')

      for (const row of expiredCerts ?? []) {
        const isDupe = await wasRecentlySent(service, companyId, row.employee_id, row.role_id, 'expired', cutoff24h)
        if (isDupe) { totalSkipped++; continue }

        const phone = await getPhone(service, row.employee_id)
        if (!phone) continue

        const msg = `🚨 Your ${row.role_name} certification has expired. Please contact your manager to schedule recertification.`

        const result = await sendSMS(creds, phone, msg)
        await logNotification(service, companyId, phone, msg, 'expired', row.employee_id, row.role_id, result.success, result.error)
        if (result.success) totalSent++
      }
    }

    // ── 3. Pending review > 48h ──────────────────────────────────────────────
    if (settings.notify_pending_48h) {
      const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

      const { data: pendingCerts } = await service
        .from('v_cert_status')
        .select('employee_id, role_id, employee_name, employee_email, role_name, assigned_at')
        .eq('company_id', companyId)
        .eq('cert_status', 'pending_review')
        .lt('assigned_at', cutoff48h)

      for (const row of pendingCerts ?? []) {
        const isDupe = await wasRecentlySent(service, companyId, row.employee_id, row.role_id, 'pending_48h', cutoff24h)
        if (isDupe) { totalSkipped++; continue }

        const phone = await getPhone(service, row.employee_id)
        if (!phone) continue

        const msg = `📋 Heads up: ${row.employee_name ?? row.employee_email} is awaiting certification review for ${row.role_name}. Please review when you can.`

        const result = await sendSMS(creds, phone, msg)
        await logNotification(service, companyId, phone, msg, 'pending_48h', row.employee_id, row.role_id, result.success, result.error)
        if (result.success) totalSent++
      }
    }
  }

  return NextResponse.json({ message: 'Cron complete', sent: totalSent, skipped: totalSkipped })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type ServiceClient = ReturnType<typeof createServiceRoleClient>

async function getPhone(service: ServiceClient, employeeId: string): Promise<string | null> {
  const { data } = await service
    .from('profiles')
    .select('phone_number')
    .eq('id', employeeId)
    .single()
  return data?.phone_number ?? null
}

async function wasRecentlySent(
  service: ServiceClient,
  companyId: string,
  employeeId: string,
  roleId: string,
  eventType: string,
  since: string
): Promise<boolean> {
  const { data } = await service
    .from('notification_log')
    .select('id')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .eq('role_id', roleId)
    .eq('event_type', eventType)
    .eq('channel', 'sms')
    .gte('created_at', since)
    .limit(1)

  return (data?.length ?? 0) > 0
}

async function logNotification(
  service: ServiceClient,
  companyId: string,
  recipient: string,
  message: string,
  eventType: string,
  employeeId: string,
  roleId: string,
  success: boolean,
  error?: string
) {
  await service.from('notification_log').insert({
    company_id: companyId,
    channel: 'sms',
    recipient,
    message,
    event_type: eventType,
    employee_id: employeeId,
    role_id: roleId,
    status: success ? 'sent' : 'failed',
    error: error ?? null,
  })
}
