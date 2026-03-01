import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RevokeBody {
  employeeId: string
  roleId: string
  reason?: string
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

    const { employeeId, roleId, reason } = await request.json() as RevokeBody

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

    const { error } = await supabase
      .from('employee_roles')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revocation_reason: reason ?? null,
      })
      .eq('employee_id', employeeId)
      .eq('role_id', roleId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
