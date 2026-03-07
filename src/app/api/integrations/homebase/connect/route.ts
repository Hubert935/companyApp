import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { testHomebaseConnection } from '@/lib/integrations/homebase'

interface ConnectBody {
  api_key: string
  location_id: string
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

    const { api_key, location_id } = await request.json() as ConnectBody

    if (!api_key || !location_id) {
      return NextResponse.json({ error: 'api_key and location_id are required' }, { status: 400 })
    }

    // Test the connection before saving
    const ok = await testHomebaseConnection(api_key, location_id)
    if (!ok) {
      return NextResponse.json({ error: 'Could not connect to Homebase with those credentials. Check your API key and location ID.' }, { status: 400 })
    }

    const service = createServiceRoleClient()
    const { error } = await service
      .from('integrations')
      .upsert({
        company_id: profile.company_id,
        provider: 'homebase',
        config: { api_key, location_id },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,provider' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE() {
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

    const service = createServiceRoleClient()
    await service
      .from('integrations')
      .delete()
      .eq('company_id', profile.company_id)
      .eq('provider', 'homebase')

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
