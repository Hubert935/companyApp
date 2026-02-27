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

  const [employeesResult, sopsResult, assignmentsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
      .neq('id', user.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('sops')
      .select('id, title')
      .eq('company_id', profile.company_id)
      .eq('is_archived', false)
      .order('title'),

    supabase
      .from('assignments')
      .select('id, sop_id, employee_id, completed_at, due_date')
      .in(
        'sop_id',
        // We'll refetch after getting sops — passing placeholder for now
        ['00000000-0000-0000-0000-000000000000']
      ),
  ])

  // Refetch assignments properly
  const sopIds = (sopsResult.data ?? []).map((s) => s.id)
  const { data: assignments } = sopIds.length
    ? await supabase
        .from('assignments')
        .select('id, sop_id, employee_id, completed_at, due_date')
        .in('sop_id', sopIds)
    : { data: [] }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">Manage employees and assign training</p>
        </div>
      </div>

      {/* Invite form */}
      <InviteForm companyId={profile.company_id!} invitedBy={user.id} />

      {/* Employee list */}
      {!employeesResult.data || employeesResult.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite employees above to assign SOPs and track their training progress."
        />
      ) : (
        <EmployeeList
          employees={employeesResult.data}
          sops={sopsResult.data ?? []}
          assignments={assignments ?? []}
          currentUserId={user.id}
        />
      )}
    </div>
  )
}
