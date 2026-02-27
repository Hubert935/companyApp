import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import TrainingChecklist from '@/components/employees/TrainingChecklist'
import type { AssignmentWithSOP } from '@/types'

export default async function MyTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Fetch all assignments for this employee with SOP + steps
  const { data: rawAssignments } = await supabase
    .from('assignments')
    .select(`
      id, completed_at, due_date, created_at,
      sop:sops(
        id, title, description,
        steps:sop_steps(id, position, title, content, image_url)
      )
    `)
    .eq('employee_id', user.id)
    .order('created_at', { ascending: true })

  // Supabase returns a complex inferred type for joined queries;
  // cast to the shared AssignmentWithSOP shape used by TrainingChecklist.
  const assignments = (rawAssignments ?? []) as AssignmentWithSOP[]

  // Fetch completed steps for this user
  const assignmentIds = assignments.map((a) => a.id)
  const { data: completions } = assignmentIds.length
    ? await supabase
        .from('step_completions')
        .select('step_id, assignment_id')
        .in('assignment_id', assignmentIds)
        .eq('employee_id', user.id)
    : { data: [] as { step_id: string; assignment_id: string }[] }

  const completedStepIds = new Set<string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (completions ?? []).map((c: any) => c.step_id)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Training</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400  mt-1">
          Complete each SOP to finish your onboarding
        </p>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No training assigned yet"
          description="Your manager will assign SOPs to complete. Check back soon."
        />
      ) : (
        <TrainingChecklist
          assignments={assignments}
          completedStepIds={completedStepIds}
          employeeId={user.id}
        />
      )}
    </div>
  )
}
