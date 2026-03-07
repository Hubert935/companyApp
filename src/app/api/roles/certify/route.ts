import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fireWebhookEvent } from '@/lib/integrations/webhook'

interface CertifyBody {
  employeeId: string
  roleId: string
  expiresAt?: string | null    // ISO date string, optional
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

    const { employeeId, roleId, expiresAt } = await request.json() as CertifyBody

    if (!employeeId || !roleId) {
      return NextResponse.json({ error: 'employeeId and roleId are required' }, { status: 400 })
    }

    // Verify the role belongs to this company
    const { data: role } = await supabase
      .from('company_roles')
      .select('id')
      .eq('id', roleId)
      .eq('company_id', profile.company_id)
      .single()

    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })

    // Snapshot the current role_sops at the moment of certification
    const { data: roleSops } = await supabase
      .from('role_sops')
      .select('sop_id, position')
      .eq('role_id', roleId)
      .order('position')

    const snapshot = (roleSops ?? []).map((rs) => ({ sop_id: rs.sop_id, position: rs.position }))

    const { error } = await supabase
      .from('employee_roles')
      .update({
        certified_at: new Date().toISOString(),
        certified_by: user.id,
        expires_at: expiresAt ?? null,
        role_snapshot: snapshot,
        // Clear any prior revocation if re-certifying
        revoked_at: null,
        revoked_by: null,
        revocation_reason: null,
      })
      .eq('employee_id', employeeId)
      .eq('role_id', roleId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fire webhook event asynchronously — don't block the response
    fireWebhookEvent(profile.company_id, 'cert.created', {
      employee_id: employeeId,
      role_id: roleId,
      certified_at: new Date().toISOString(),
      certified_by: user.id,
      expires_at: expiresAt ?? null,
    }).catch(() => { /* best-effort */ })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
