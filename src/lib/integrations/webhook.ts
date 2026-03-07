import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/service'

export type WebhookEvent =
  | 'cert.created'
  | 'cert.revoked'
  | 'cert.expired'
  | 'role.below_threshold'
  | 'health.at_risk'

export function signPayload(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export async function deliverWebhook(
  url: string,
  secret: string,
  payload: object
): Promise<Response> {
  const body = JSON.stringify(payload)
  const sig  = signPayload(secret, body)
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature-256': `sha256=${sig}`,
    },
    body,
  })
}

/**
 * Find all active webhook endpoints for this company that subscribe to `event`,
 * deliver the payload to each, and update last_fired_at / last_status_code.
 */
export async function fireWebhookEvent(
  companyId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const service = createServiceRoleClient()

  const { data: endpoints } = await service
    .from('webhook_endpoints')
    .select('id, url, secret')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .contains('events', [event])

  if (!endpoints?.length) return

  const payload = { event, data, fired_at: new Date().toISOString() }

  await Promise.allSettled(
    endpoints.map(async (ep) => {
      let statusCode: number | null = null
      try {
        const res = await deliverWebhook(ep.url, ep.secret, payload)
        statusCode = res.status
      } catch {
        statusCode = null
      }
      await service
        .from('webhook_endpoints')
        .update({
          last_fired_at: new Date().toISOString(),
          last_status_code: statusCode,
        })
        .eq('id', ep.id)
    })
  )
}
