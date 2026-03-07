import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deliverWebhook } from '@/lib/integrations/webhook'

interface TestBody {
  endpointId: string
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

    const { endpointId } = await request.json() as TestBody
    if (!endpointId) return NextResponse.json({ error: 'endpointId required' }, { status: 400 })

    const { data: endpoint } = await supabase
      .from('webhook_endpoints')
      .select('url, secret')
      .eq('id', endpointId)
      .eq('company_id', profile.company_id)
      .single()

    if (!endpoint) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })

    const testPayload = {
      event: 'cert.created',
      data: {
        employee_id: 'test-employee-id',
        role_id: 'test-role-id',
        certified_at: new Date().toISOString(),
        certified_by: user.id,
        _test: true,
      },
      fired_at: new Date().toISOString(),
    }

    const res = await deliverWebhook(endpoint.url, endpoint.secret, testPayload)

    return NextResponse.json({ success: res.ok, status_code: res.status })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
