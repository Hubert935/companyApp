import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Users, ShieldCheck, AlertTriangle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import OperationalHealthWidget from '@/components/dashboard/OperationalHealthWidget'
import ExpiryAlertFeed from '@/components/dashboard/ExpiryAlertFeed'
import WeeklyReviewPanel from '@/components/dashboard/WeeklyReviewPanel'
import type { CompanyHealthRow, RoleCoverageRow, ExpiryRiskRow, CertStatusRow } from '@/types/intelligence'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  const params = await searchParams
  const tab = params.tab ?? 'overview'

  // Parallel data fetch — intelligence views + legacy stat queries
  const [healthResult, coverageResult, expiryResult, certStatusResult, sopsResult, employeesResult] =
    await Promise.all([
      supabase.from('v_company_health').select('*').single(),
      supabase.from('v_role_coverage').select('*').order('coverage_pct'),
      supabase.from('v_expiry_risk').select('*').order('priority_score', { ascending: false }),
      supabase.from('v_cert_status').select('*'),
      supabase.from('sops').select('id', { count: 'exact' })
        .eq('company_id', profile.company_id as string).eq('is_archived', false),
      supabase.from('profiles').select('id', { count: 'exact' })
        .eq('company_id', profile.company_id as string).neq('role', 'owner'),
    ])

  const health       = healthResult.data as CompanyHealthRow | null
  const coverage     = (coverageResult.data ?? []) as RoleCoverageRow[]
  const expiryRisk   = (expiryResult.data ?? []) as ExpiryRiskRow[]
  const certStatuses = (certStatusResult.data ?? []) as CertStatusRow[]
  const sopCount     = sopsResult.count ?? 0
  const teamCount    = employeesResult.count ?? 0

  // Derived for overview
  const spofRoles      = coverage.filter((r) => r.is_spof)
  const criticalExpiry = expiryRisk.filter((e) => e.expiry_window === '7d')
  const pendingReview  = certStatuses.filter((cs) => cs.cert_status === 'pending_review')
  const certifiedTotal = health?.total_certified ?? 0
  const hasAlerts      = criticalExpiry.length > 0 || spofRoles.some((r) => r.certified_count === 0)

  const firstName = profile.full_name?.split(' ')[0] ?? null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </p>
        </div>
        <Link href="/sops/new">
          <Button><Plus className="w-4 h-4" />New SOP</Button>
        </Link>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'weekly',   label: 'Weekly review' },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.id === 'overview' ? '/dashboard' : `/dashboard?tab=${t.id}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'weekly' ? (
        /* ─────────────────────────────────────────────────────────
           WEEKLY REVIEW TAB
        ───────────────────────────────────────────────────────── */
        <WeeklyReviewPanel
          certStatuses={certStatuses}
          expiryRisk={expiryRisk}
          roleCoverage={coverage}
        />
      ) : (
        /* ─────────────────────────────────────────────────────────
           OVERVIEW TAB
        ───────────────────────────────────────────────────────── */
        <>
          {/* 1. Operational Health Widget */}
          {health && <OperationalHealthWidget data={health} />}

          {/* 2. Action required — critical alerts */}
          {hasAlerts && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <h2 className="font-semibold text-red-900 dark:text-red-300 text-sm">Needs attention now</h2>
              </div>
              <ul className="space-y-1.5">
                {criticalExpiry.map((e) => (
                  <li key={`${e.employee_id}-${e.role_id}`} className="text-sm text-red-800 dark:text-red-300">
                    <span className="font-medium">{e.employee_name ?? e.employee_email}</span>
                    {' — '}
                    {e.role_name}: expires in {e.days_until_expiry} day{e.days_until_expiry !== 1 ? 's' : ''}
                    {e.is_spof && <Badge variant="red" className="ml-2">Only certified person</Badge>}
                  </li>
                ))}
                {spofRoles.filter((r) => r.certified_count === 0).map((r) => (
                  <li key={r.role_id} className="text-sm text-red-800 dark:text-red-300">
                    <span className="font-medium">{r.role_name}</span>: no certified employees
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 3. Expiry alert feed */}
          {expiryRisk.length > 0 && (
            <ExpiryAlertFeed items={expiryRisk} />
          )}

          {/* 4. Role coverage strip — worst 3 roles */}
          {coverage.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-white">Role coverage</h2>
                <Link href="/roles" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {coverage.slice(0, 3).map((role) => {
                  const isBad  = role.is_spof || role.below_threshold
                  const isWarn = !isBad && role.expiring_30d > 0
                  const pct    = Math.min(100, Math.round(role.coverage_pct))
                  const barColor = isBad ? 'bg-red-500' : isWarn ? 'bg-orange-400' : 'bg-green-500'

                  return (
                    <li key={role.role_id} className="flex items-center gap-4 px-6 py-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-40 truncate">
                        {role.role_name}
                      </span>
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums w-28 text-right">
                        {role.certified_count}/{role.minimum_certified_count} certified
                        {role.is_spof && <span className="text-red-500 ml-1">· SPOF</span>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* 5. Pending certifications */}
          {pendingReview.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-white">Awaiting certification</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {pendingReview.length} employee{pendingReview.length !== 1 ? 's' : ''} completed training and need your approval
                </p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {pendingReview.slice(0, 5).map((cs) => (
                  <li key={`${cs.employee_id}-${cs.role_id}`} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {cs.employee_name ?? cs.employee_email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cs.role_name}</p>
                    </div>
                    <Link href="/employees">
                      <Button size="sm">Review</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 6. Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="SOPs"
              value={sopCount}
              icon={<BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              bg="bg-blue-50 dark:bg-blue-900/30"
            />
            <StatCard
              label="Team members"
              value={teamCount}
              icon={<Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
              bg="bg-purple-50 dark:bg-purple-900/30"
            />
            <StatCard
              label="Certified"
              value={certifiedTotal}
              icon={<ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />}
              bg="bg-green-50 dark:bg-green-900/30"
            />
            <StatCard
              label="Roles defined"
              value={coverage.length}
              icon={<Users className="w-5 h-5 text-orange-500 dark:text-orange-400" />}
              bg="bg-orange-50 dark:bg-orange-900/30"
            />
          </div>

          {/* Empty state */}
          {sopCount === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 text-center">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Start by creating your first SOP
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                Document a process your team needs to follow consistently.
              </p>
              <Link href="/sops/new">
                <Button><Plus className="w-4 h-4" />Create first SOP</Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, bg }: {
  label: string; value: number; icon: React.ReactNode; bg: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
