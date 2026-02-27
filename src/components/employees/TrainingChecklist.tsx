'use client'

import { useState, useOptimistic } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProgressBar from '@/components/ui/ProgressBar'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import type { SOPStep } from '@/types'

interface StepWithSOP {
  id: string
  position: number
  title: string
  content: string | null
  image_url: string | null
}

interface AssignmentWithSOP {
  id: string
  completed_at: string | null
  due_date: string | null
  sop: {
    id: string
    title: string
    description: string | null
    steps: StepWithSOP[]
  }
}

interface TrainingChecklistProps {
  assignments: AssignmentWithSOP[]
  completedStepIds: Set<string>
  employeeId: string
}

export default function TrainingChecklist({
  assignments,
  completedStepIds: initialCompleted,
  employeeId,
}: TrainingChecklistProps) {
  const router = useRouter()
  const [completed, setCompleted] = useState<Set<string>>(initialCompleted)
  const [expanded, setExpanded] = useState<string | null>(
    // Auto-expand first incomplete assignment
    assignments.find((a) => !a.completed_at)?.id ?? null
  )
  const [loading, setLoading] = useState<string | null>(null)

  async function toggleStep(assignmentId: string, stepId: string) {
    const isCompleted = completed.has(stepId)
    const key = `${assignmentId}-${stepId}`
    setLoading(key)

    // Optimistic update
    setCompleted((prev) => {
      const next = new Set(prev)
      if (isCompleted) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })

    const supabase = createClient()

    if (isCompleted) {
      // Uncomplete step
      await supabase
        .from('step_completions')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('step_id', stepId)
        .eq('employee_id', employeeId)
    } else {
      // Complete step
      await supabase.from('step_completions').upsert({
        assignment_id: assignmentId,
        step_id: stepId,
        employee_id: employeeId,
      })
    }

    setLoading(null)
    router.refresh()
  }

  const totalSteps = assignments.reduce((acc, a) => acc + (a.sop.steps?.length ?? 0), 0)
  const completedTotal = assignments.reduce(
    (acc, a) => acc + (a.sop.steps?.filter((s) => completed.has(s.id)).length ?? 0),
    0
  )
  const overallProgress = totalSteps > 0 ? Math.round((completedTotal / totalSteps) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      {totalSteps > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Overall progress</h2>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{overallProgress}%</span>
          </div>
          <ProgressBar value={overallProgress} />
          <p className="text-xs text-gray-400 mt-2">
            {completedTotal} of {totalSteps} steps completed
          </p>
          {overallProgress === 100 && (
            <div className="mt-4 flex dark:bg-gray-700 dark:border-gray-600 items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl">
              <Trophy className="w-5 h-5" />
              <span className="text-sm font-medium">All training complete! Great work.</span>
            </div>
          )}
        </div>
      )}

      {/* Assignment cards */}
      {assignments.map((assignment) => {
        const steps = assignment.sop.steps ?? []
        const sortedSteps = [...steps].sort((a, b) => a.position - b.position)
        const doneSteps = sortedSteps.filter((s) => completed.has(s.id)).length
        const totalS = sortedSteps.length
        const progress = totalS > 0 ? Math.round((doneSteps / totalS) * 100) : 0
        const isComplete = assignment.completed_at || progress === 100
        const isExpanded = expanded === assignment.id

        return (
          <div key={assignment.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setExpanded(isExpanded ? null : assignment.id)}
              className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{assignment.sop.title}</h3>
                  {isComplete ? (
                    <Badge variant="green">Complete</Badge>
                  ) : assignment.due_date ? (
                    <Badge variant="orange">Due {formatDate(assignment.due_date)}</Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={progress} className="flex-1" />
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {doneSteps}/{totalS}
                  </span>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </button>

            {/* Steps */}
            {isExpanded && (
              <div className="border-t border-gray-100">
                {assignment.sop.description && (
                  <p className="px-5 pt-4 text-sm text-gray-500">{assignment.sop.description}</p>
                )}
                <ul className="divide-y divide-gray-50">
                  {sortedSteps.map((step) => {
                    const isDone = completed.has(step.id)
                    const isLoading = loading === `${assignment.id}-${step.id}`

                    return (
                      <li key={step.id} className="px-5 py-4">
                        <button
                          onClick={() => toggleStep(assignment.id, step.id)}
                          disabled={isLoading}
                          className="w-full flex items-start gap-3 text-left group"
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                isDone ? 'line-through text-gray-400' : 'text-gray-900'
                              }`}
                            >
                              <span className="text-gray-400 mr-1.5">{step.position}.</span>
                              {step.title}
                            </p>
                            {step.content && !isDone && (
                              <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">
                                {step.content}
                              </p>
                            )}
                            {step.image_url && !isDone && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={step.image_url}
                                alt={step.title}
                                className="mt-2 w-full rounded-xl border border-gray-200 object-cover max-h-48"
                              />
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
