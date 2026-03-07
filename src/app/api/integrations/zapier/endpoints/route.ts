import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import crypto from 'crypto'

const ALL_EVENTS = [
  'cert.created',
  'cert.revoked',
  'cert.expired',
  'role.below_threshold',
  'health.at_risk',
]

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

    const { data: endpoints } = await supabase
      .from('webhook_endpoints')
      .select('id, url, label, events, is_active, last_fired_at, last_status_code, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ endpoints: endpoints ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
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

    const body = await request.json() as { url: string; label?: string; events?: string[] }

    if (!body.url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

    // Auto-generate a random signing secret
    const secret = crypto.randomBytes(32).toString('hex')

    const service = createServiceRoleClient()
    const { data: endpoint, error } = await service
      .from('webhook_endpoints')
      .insert({
        company_id: profile.company_id,
        url: body.url,
        secret,
        label: body.label ?? null,
        events: body.events ?? ALL_EVENTS,
        is_active: true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Return the secret ONCE — it won't be shown again
    return NextResponse.json({ endpoint: { ...endpoint, secret } }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
