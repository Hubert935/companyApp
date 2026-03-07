import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

interface ChannelBody {
  channel_id: string
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

    const { channel_id } = await request.json() as ChannelBody
    if (!channel_id) return NextResponse.json({ error: 'channel_id required' }, { status: 400 })

    // Load existing config to merge
    const { data: existing } = await supabase
      .from('integrations')
      .select('config')
      .eq('company_id', profile.company_id)
      .eq('provider', 'slack')
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    const existingConfig = (existing.config ?? {}) as Record<string, unknown>
    const newConfig = { ...existingConfig, channel_id }

    const service = createServiceRoleClient()
    const { error } = await service
      .from('integrations')
      .update({ config: newConfig, updated_at: new Date().toISOString() })
      .eq('company_id', profile.company_id)
      .eq('provider', 'slack')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
