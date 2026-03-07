import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ShieldCheck } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import RoleCoverageCard from '@/components/roles/RoleCoverageCard'
import type { RoleCoverageRow } from '@/types/intelligence'

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

  // Single query to v_role_coverage — replaces the double-query pattern
  const { data: coverageData } = await supabase
    .from('v_role_coverage')
    .select('*')
    .order('role_name')

  const coverage = (coverageData ?? []) as unknown as RoleCoverageRow[]

  // Summary stats for the strip
  const fullyCovered  = coverage.filter((r) => !r.below_threshold && r.certified_count > 0).length
  const spofCount     = coverage.filter((r) => r.is_spof).length
  const belowCount    = coverage.filter((r) => r.below_threshold && !r.is_spof).length
  const hasRiskRoles  = spofCount > 0 || belowCount > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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

      {coverage.length === 0 ? (
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
        <>
          {/* Coverage summary strip */}
          <div className={`rounded-2xl px-5 py-3 flex items-center gap-6 flex-wrap text-sm ${
            hasRiskRoles
              ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50'
              : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700'
          }`}>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {coverage.length} role{coverage.length !== 1 ? 's' : ''}
            </span>
            <span className="text-green-700 dark:text-green-400 font-medium">
              {fullyCovered} fully covered
            </span>
            {spofCount > 0 && (
              <span className="text-red-700 dark:text-red-400 font-medium">
                {spofCount} SPOF
              </span>
            )}
            {belowCount > 0 && (
              <span className="text-orange-700 dark:text-orange-400 font-medium">
                {belowCount} below threshold
              </span>
            )}
          </div>

          {/* Role cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {coverage.map((role) => (
              <RoleCoverageCard key={role.role_id} role={role} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
