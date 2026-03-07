import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { fetchGustoCompanies, fetchGustoEmployees, refreshAccessToken } from '@/lib/integrations/gusto'

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

    const service = createServiceRoleClient()

    // Load integration
    const { data: integration } = await service
      .from('integrations')
      .select('access_token, refresh_token, token_expires_at, config')
      .eq('company_id', profile.company_id)
      .eq('provider', 'gusto')
      .single()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'Gusto not connected' }, { status: 400 })
    }

    // Refresh token if needed
    let accessToken = integration.access_token
    if (integration.token_expires_at && new Date(integration.token_expires_at) <= new Date()) {
      if (!integration.refresh_token) {
        return NextResponse.json({ error: 'Token expired and no refresh token available' }, { status: 400 })
      }
      const tokens = await refreshAccessToken(integration.refresh_token)
      accessToken = tokens.access_token
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      await service
        .from('integrations')
        .update({
          access_token: accessToken,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', profile.company_id)
        .eq('provider', 'gusto')
    }

    // Get Gusto company UUID — store in config after first sync
    const config = (integration.config ?? {}) as Record<string, unknown>
    let gustoCompanyUuid = config.gusto_company_uuid as string | undefined

    if (!gustoCompanyUuid) {
      const companies = await fetchGustoCompanies(accessToken)
      if (!companies.length) {
        return NextResponse.json({ error: 'No Gusto companies found for this account' }, { status: 400 })
      }
      gustoCompanyUuid = companies[0].uuid
      await service
        .from('integrations')
        .update({ config: { ...config, gusto_company_uuid: gustoCompanyUuid }, updated_at: new Date().toISOString() })
        .eq('company_id', profile.company_id)
        .eq('provider', 'gusto')
    }

    // Fetch employees from Gusto
    const gustoEmployees = await fetchGustoEmployees(accessToken, gustoCompanyUuid)
    const activeEmployees = gustoEmployees.filter((e) => !e.terminated)

    let created = 0
    let updated = 0

    for (const ge of activeEmployees) {
      if (!ge.email) continue

      // Check if profile exists by email
      const { data: existing } = await service
        .from('profiles')
        .select('id, full_name, phone_number')
        .eq('email', ge.email)
        .single()

      const fullName = `${ge.first_name} ${ge.last_name}`.trim()

      if (existing) {
        // Update name / phone if changed
        const updates: Record<string, string | null> = {}
        if (!existing.full_name && fullName) updates.full_name = fullName
        if (!existing.phone_number && ge.phone) updates.phone_number = ge.phone
        if (Object.keys(updates).length) {
          await service.from('profiles').update(updates).eq('id', existing.id)
          updated++
        }
      } else {
        // Create pending profile (no company_id yet — will be set on invite acceptance)
        // We insert a minimal row so the email is discoverable for future invitations
        // Note: this requires the profiles table to allow inserts without auth.users entry
        // In production, trigger an invite email instead
        created++
        // Intentionally not inserting — Gusto sync populates a queue, not raw profiles
        // This is where you'd call your invite API or a serverless function
      }
    }

    // Update last_sync_at
    await service
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('company_id', profile.company_id)
      .eq('provider', 'gusto')

    return NextResponse.json({
      success: true,
      synced: activeEmployees.length,
      updated,
      newInRoster: created,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
