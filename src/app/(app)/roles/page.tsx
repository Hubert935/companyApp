import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import type { BadgeVariant } from '@/components/ui/Badge'
import { getCertStatus } from '@/types'

export default async function RolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'manager'].includes(profile.role)) redirect('/dashboard')
  if (!profile.company_id) redirect('/auth/login')

  const [rolesResult, empRolesResult] = await Promise.all([
    supabase
      .from('company_roles')
      .select('*, role_sops(sop_id, position)')
      .eq('company_id', profile.company_id)
      .order('name'),

    supabase
      .from('employee_roles')
      .select('role_id, employee_id, training_completed_at, certified_at, expires_at, role_snapshot, revoked_at')
      .in(
        'role_id',
        // We'll filter client-side; select all company role ids after fetch
        (await supabase
          .from('company_roles')
          .select('id')
          .eq('company_id', profile.company_id)
        ).data?.map((r) => r.id) ?? []
      ),
  ])

  type RoleRow = {
    id: string
    name: string
    description: string | null
    color: string
    created_at: string
    role_sops: { sop_id: string; position: number }[]
  }

  type EmpRoleRow = {
    role_id: string
    employee_id: string
    training_completed_at: string | null
    certified_at: string | null
    expires_at: string | null
    role_snapshot: unknown
    revoked_at: string | null
  }

  const roles = (rolesResult.data ?? []) as unknown as RoleRow[]
  const empRoles = (empRolesResult.data ?? []) as unknown as EmpRoleRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define job functions and the SOPs required to certify capability
          </p>
        </div>
        <Link href="/roles/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Role
          </Button>
        </Link>
      </div>

      {roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No roles yet"
          description="Create a role to define what each job function requires. Assign it to employees and certify them when they're ready."
          action={
            <Link href="/roles/new">
              <Button>
                <Plus className="w-4 h-4" />
                Create first role
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => {
            const sopIds = (role.role_sops ?? []).map((rs) => rs.sop_id)
            const roleEmpRows = empRoles.filter((er) => er.role_id === role.id)

            const certifiedCount = roleEmpRows.filter((er) => {
              const status = getCertStatus(
                {
                  revoked_at: er.revoked_at,
                  certified_at: er.certified_at,
                  expires_at: er.expires_at,
                  role_snapshot: er.role_snapshot as Parameters<typeof getCertStatus>[0]['role_snapshot'],
                  training_completed_at: er.training_completed_at,
                },
                sopIds
              )
              return status === 'certified'
            }).length

            const pendingCount = roleEmpRows.filter((er) => {
              const status = getCertStatus(
                {
                  revoked_at: er.revoked_at,
                  certified_at: er.certified_at,
                  expires_at: er.expires_at,
                  role_snapshot: er.role_snapshot as Parameters<typeof getCertStatus>[0]['role_snapshot'],
                  training_completed_at: er.training_completed_at,
                },
                sopIds
              )
              return status === 'pending_review'
            }).length

            return (
              <Link
                key={role.id}
                href={`/roles/${role.id}`}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `var(--color-${role.color}-100, #eff6ff)` }}
                  >
                    <ShieldCheck className={`w-5 h-5 text-${role.color}-600 dark:text-${role.color}-400`} />
                  </div>
                  <Badge variant={role.color as BadgeVariant}>{role.color}</Badge>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{role.name}</h3>
                {role.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{role.description}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <Badge variant="blue">{sopIds.length} SOP{sopIds.length !== 1 ? 's' : ''}</Badge>
                  {certifiedCount > 0 && (
                    <Badge variant="green">{certifiedCount} certified</Badge>
                  )}
                  {pendingCount > 0 && (
                    <Badge variant="orange">{pendingCount} pending review</Badge>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
