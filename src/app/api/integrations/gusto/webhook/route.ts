import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/integrations/gusto/webhook
 * Receives Gusto webhook events (employee.created, employee.terminated, etc.)
 * Verifies the HMAC-SHA256 signature using GUSTO_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-gusto-signature')

    if (!process.env.GUSTO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    // Verify HMAC signature
    if (signature) {
      const expected = crypto
        .createHmac('sha256', process.env.GUSTO_WEBHOOK_SECRET)
        .update(body)
        .digest('hex')

      if (signature !== `sha256=${expected}`) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(body) as {
      event_type: string
      entity_type: string
      entity_uuid: string
      timestamp: string
    }

    // Handle supported event types
    switch (event.event_type) {
      case 'employee.created':
        // A new employee was added in Gusto
        // Trigger a sync to pick them up
        // In production, call /api/integrations/gusto/sync internally or queue a job
        console.log('[Gusto webhook] employee.created:', event.entity_uuid)
        break

      case 'employee.terminated':
        // An employee was terminated in Gusto
        // Optionally revoke their active certifications
        console.log('[Gusto webhook] employee.terminated:', event.entity_uuid)
        break

      default:
        // Acknowledge but ignore unknown events
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
