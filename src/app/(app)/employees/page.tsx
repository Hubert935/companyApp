import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import EmployeeList from '@/components/employees/EmployeeList'
import InviteForm from '@/components/employees/InviteForm'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const companyId = profile.company_id as string

  const [employeesResult, sopsResult, rolesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId)
      .neq('id', user.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('sops')
      .select('id, title')
      .eq('company_id', companyId)
      .eq('is_archived', false)
      .order('title'),

    supabase
      .from('company_roles')
      .select('id, name, color, role_sops(sop_id, position)')
      .eq('company_id', companyId)
      .order('name'),
  ])

  const sopIds = (sopsResult.data ?? []).map((s) => s.id)
  const roleIds = (rolesResult.data ?? []).map((r) => r.id)

  const [assignmentsResult, employeeRolesResult] = await Promise.all([
    sopIds.length
      ? supabase
          .from('assignments')
          .select('id, sop_id, employee_id, completed_at, due_date')
          .in('sop_id', sopIds)
      : Promise.resolve({ data: [] }),

    roleIds.length
      ? supabase
          .from('employee_roles')
          .select('employee_id, role_id, training_completed_at, certified_at, certified_by, expires_at, role_snapshot, revoked_at')
          .in('role_id', roleIds)
      : Promise.resolve({ data: [] }),
  ])

  type RoleWithSOPs = {
    id: string
    name: string
    color: string
    role_sops: { sop_id: string; position: number }[]
  }

  type EmployeeRoleRow = {
    employee_id: string
    role_id: string
    training_completed_at: string | null
    certified_at: string | null
    certified_by: string | null
    expires_at: string | null
    role_snapshot: unknown
    revoked_at: string | null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employees, assign roles, and certify capability</p>
        </div>
      </div>

      <InviteForm companyId={companyId} invitedBy={user.id} />

      {!employeesResult.data || employeesResult.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite employees above to assign roles and track their training progress."
        />
      ) : (
        <EmployeeList
          employees={employeesResult.data}
          sops={sopsResult.data ?? []}
          assignments={(assignmentsResult.data ?? []) as { id: string; sop_id: string; employee_id: string; completed_at: string | null; due_date: string | null }[]}
          roles={(rolesResult.data ?? []) as unknown as RoleWithSOPs[]}
          employeeRoles={(employeeRolesResult.data ?? []) as unknown as EmployeeRoleRow[]}
          currentUserId={user.id}
        />
      )}
    </div>
  )
}
