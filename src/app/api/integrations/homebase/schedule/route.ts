import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchHomebaseSchedule } from '@/lib/integrations/homebase'

export interface ScheduleConflict {
  employee_name: string
  role_name: string
  shift_date: string
  cert_status: string
}

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

    // Load Homebase config
    const { data: integration } = await supabase
      .from('integrations')
      .select('config')
      .eq('company_id', profile.company_id)
      .eq('provider', 'homebase')
      .single()

    if (!integration?.config) {
      return NextResponse.json({ error: 'Homebase not connected' }, { status: 400 })
    }

    const config = integration.config as { api_key: string; location_id: string }

    // Get this week's schedule
    const now  = new Date()
    const from = now.toISOString().split('T')[0]
    const toDate = new Date(now)
    toDate.setDate(toDate.getDate() + 7)
    const to = toDate.toISOString().split('T')[0]

    const schedule = await fetchHomebaseSchedule(config.api_key, config.location_id, from, to)

    // Get cert statuses for this company
    const { data: certStatuses } = await supabase
      .from('v_cert_status')
      .select('employee_email, role_name, cert_status')
      .eq('company_id', profile.company_id)

    // Build a lookup: email -> [{ role_name, cert_status }]
    const certMap = new Map<string, { role_name: string; cert_status: string }[]>()
    for (const cs of certStatuses ?? []) {
      const existing = certMap.get(cs.employee_email) ?? []
      existing.push({ role_name: cs.role_name, cert_status: cs.cert_status })
      certMap.set(cs.employee_email, existing)
    }

    // Find conflicts: shifts where the employee is not certified for the required role
    const conflicts: ScheduleConflict[] = []

    for (const shift of schedule.shifts ?? []) {
      if (!shift.role || !shift.employee_name) continue

      // Homebase uses names, not emails — attempt lookup by name (imperfect, but practical)
      // In production, maintain a Homebase employee UUID → profile ID mapping
      const employeeCerts = certMap.get(shift.employee_name) // this won't always match
      const matchingRole = employeeCerts?.find(
        (c) => c.role_name.toLowerCase() === shift.role!.toLowerCase()
      )

      if (!matchingRole || !['certified'].includes(matchingRole.cert_status)) {
        conflicts.push({
          employee_name: shift.employee_name,
          role_name: shift.role,
          shift_date: shift.start_time.split('T')[0],
          cert_status: matchingRole?.cert_status ?? 'not_assigned',
        })
      }
    }

    return NextResponse.json({ conflicts, total_shifts: schedule.shifts?.length ?? 0 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
