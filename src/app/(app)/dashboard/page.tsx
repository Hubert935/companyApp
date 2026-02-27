import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Users, CheckCircle2, Clock } from 'lucide-react'
import ProgressBar from '@/components/ui/ProgressBar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

/** Shape returned by the recent-assignments joined query */
type RecentAssignment = {
  id: string
  completed_at: string | null
  due_date: string | null
  created_at: string
  employee: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null
  sop:      { title: string } | { title: string }[] | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile) redirect('/auth/login')

  const [sopsResult, employeesResult, assignmentsResult] = await Promise.all([
    supabase.from('sops').select('id', { count: 'exact' })
      .eq('company_id', profile.company_id as string).eq('is_archived', false),
    supabase.from('profiles').select('id', { count: 'exact' })
      .eq('company_id', profile.company_id as string).neq('role', 'owner'),
    supabase.from('assignments')
      .select(`id, completed_at, due_date, created_at,
        employee:profiles!assignments_employee_id_fkey(full_name, email),
        sop:sops(title)`)
      .order('created_at', { ascending: false }).limit(10),
  ])

  const { data: allAssignments } = await supabase
    .from('assignments').select('id, completed_at')

  const totalAssignments     = allAssignments?.length ?? 0
  const completedAssignments = allAssignments?.filter((a) => a.completed_at).length ?? 0
  const completionRate       = totalAssignments > 0
    ? Math.round((completedAssignments / totalAssignments) * 100) : 0

  const recentAssignments = (assignmentsResult.data ?? []) as unknown as RecentAssignment[]
  const sopCount          = sopsResult.count ?? 0
  const employeeCount     = employeesResult.count ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {profile.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Welcome back'}
          </p>
        </div>
        <Link href="/sops/new">
          <Button><Plus className="w-4 h-4" />New SOP</Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="SOPs"        value={sopCount}
          icon={<BookOpen    className="w-5 h-5 text-blue-600   dark:text-blue-400"   />}
          bg="bg-blue-50   dark:bg-blue-900/30" />
        <StatCard label="Team members" value={employeeCount}
          icon={<Users       className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          bg="bg-purple-50 dark:bg-purple-900/30" />
        <StatCard label="Completed"   value={completedAssignments}
          icon={<CheckCircle2 className="w-5 h-5 text-green-600  dark:text-green-400"  />}
          bg="bg-green-50  dark:bg-green-900/30" />
        <StatCard label="In progress" value={totalAssignments - completedAssignments}
          icon={<Clock       className="w-5 h-5 text-orange-500 dark:text-orange-400" />}
          bg="bg-orange-50 dark:bg-orange-900/30" />
      </div>

      {/* Overall completion */}
      {totalAssignments > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Overall team completion</h2>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{completionRate}%</span>
          </div>
          <ProgressBar value={completionRate} />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {completedAssignments} of {totalAssignments} assignments completed
          </p>
        </div>
      )}

      {/* Recent assignments */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent assignments</h2>
          <Link href="/employees" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all
          </Link>
        </div>

        {recentAssignments.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">
            No assignments yet.{' '}
            <Link href="/employees" className="text-blue-600 dark:text-blue-400 hover:underline">
              Invite your team
            </Link>{' '}
            to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentAssignments.map((a) => {
              const employee  = Array.isArray(a.employee) ? a.employee[0] : a.employee
              const sop       = Array.isArray(a.sop)      ? a.sop[0]      : a.sop
              const isComplete = !!a.completed_at
              return (
                <li key={a.id} className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {sop?.title ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {employee?.full_name ?? employee?.email ?? 'Unknown employee'}
                      {a.due_date && !isComplete && <> · Due {formatDate(a.due_date)}</>}
                    </p>
                  </div>
                  <Badge variant={isComplete ? 'green' : 'orange'}>
                    {isComplete ? 'Done' : 'In progress'}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* First SOP prompt */}
      {sopCount === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 text-center">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Start by creating your first SOP</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
            Document a process your team needs to follow consistently.
          </p>
          <Link href="/sops/new">
            <Button><Plus className="w-4 h-4" />Create first SOP</Button>
          </Link>
        </div>
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
