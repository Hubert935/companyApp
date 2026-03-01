'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Trophy,
  Video,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ProgressBar from '@/components/ui/ProgressBar'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

interface StepWithSOP {
  id: string
  position: number
  step_type: string
  title: string
  content: string | null
  image_url: string | null
  video_url: string | null
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
  } | null
}

interface TrainingChecklistProps {
  assignments: AssignmentWithSOP[]
  completedStepIds: Set<string>
  employeeId: string
}

// ─── Video URL helper ─────────────────────────────────────────────────────────
function getVideoUrl(url: string): string | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return `https://www.youtube.com/watch?v=${ytMatch[1]}`
  return url
}

export default function TrainingChecklist({
  assignments,
  completedStepIds: initialCompleted,
  employeeId,
}: TrainingChecklistProps) {
  const router = useRouter()
  const [completed, setCompleted] = useState<Set<string>>(initialCompleted)

  // Only consider assignments that actually have an SOP
  const validAssignments = assignments.filter((a) => a.sop)

  const [expanded, setExpanded] = useState<string | null>(
    validAssignments.find((a) => !a.completed_at)?.id ?? null
  )

  const [loading, setLoading] = useState<string | null>(null)

  async function toggleStep(assignmentId: string, stepId: string) {
    const isCompleted = completed.has(stepId)
    const key = `${assignmentId}-${stepId}`
    setLoading(key)

    // Optimistic update
    setCompleted((prev) => {
      const next = new Set(prev)
      if (isCompleted) next.delete(stepId)
      else next.add(stepId)
      return next
    })

    const supabase = createClient()

    if (isCompleted) {
      await supabase
        .from('step_completions')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('step_id', stepId)
        .eq('employee_id', employeeId)
    } else {
      await supabase.from('step_completions').upsert({
        assignment_id: assignmentId,
        step_id: stepId,
        employee_id: employeeId,
      })
    }

    setLoading(null)
    router.refresh()
  }

  // ─── Overall progress ──────────────────────────────────────────────────────

  const totalSteps = validAssignments.reduce(
    (acc, a) => acc + (a.sop?.steps?.length ?? 0),
    0
  )

  const completedTotal = validAssignments.reduce(
    (acc, a) =>
      acc +
      (a.sop?.steps?.filter((s) => completed.has(s.id)).length ?? 0),
    0
  )

  const overallProgress =
    totalSteps > 0
      ? Math.round((completedTotal / totalSteps) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      {totalSteps > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Overall progress
            </h2>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {overallProgress}%
            </span>
          </div>

          <ProgressBar value={overallProgress} />

          <p className="text-xs text-gray-400 mt-2">
            {completedTotal} of {totalSteps} steps completed
          </p>

          {overallProgress === 100 && (
            <div className="mt-4 flex dark:bg-gray-700 dark:border-gray-600 items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl">
              <Trophy className="w-5 h-5" />
              <span className="text-sm font-medium">
                All training complete! Great work.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Assignment cards */}
      {validAssignments.map((assignment) => {
        if (!assignment.sop) return null

        const steps = assignment.sop.steps ?? []
        const sortedSteps = [...steps].sort(
          (a, b) => a.position - b.position
        )

        const doneSteps = sortedSteps.filter((s) =>
          completed.has(s.id)
        ).length

        const totalS = sortedSteps.length

        const progress =
          totalS > 0
            ? Math.round((doneSteps / totalS) * 100)
            : 0

        const isComplete =
          Boolean(assignment.completed_at) || progress === 100

        const isExpanded = expanded === assignment.id

        return (
          <div
            key={assignment.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() =>
                setExpanded(isExpanded ? null : assignment.id)
              }
              className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {assignment.sop.title}
                  </h3>

                  {isComplete ? (
                    <Badge variant="green">Complete</Badge>
                  ) : assignment.due_date ? (
                    <Badge variant="orange">
                      Due {formatDate(assignment.due_date)}
                    </Badge>
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
              <div className="border-t border-gray-100 dark:border-gray-700">
                {assignment.sop.description && (
                  <p className="px-5 pt-4 text-sm text-gray-500 dark:text-gray-400">
                    {assignment.sop.description}
                  </p>
                )}

                <ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {sortedSteps.map((step) => {
                    const isDone = completed.has(step.id)
                    const isLoading =
                      loading === `${assignment.id}-${step.id}`

                    const isAck =
                      step.step_type === 'acknowledgement'
                    const isVideo = step.step_type === 'video'

                    const videoLink =
                      isVideo && step.video_url
                        ? getVideoUrl(step.video_url)
                        : null

                    return (
                      <li
                        key={step.id}
                        className={`px-5 py-4 ${
                          isAck
                            ? 'bg-amber-50/50 dark:bg-amber-900/10'
                            : ''
                        }`}
                      >
                        <button
                          onClick={() =>
                            toggleStep(assignment.id, step.id)
                          }
                          disabled={isLoading}
                          className="w-full flex items-start gap-3 text-left group"
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? (
                              <CheckCircle2
                                className={`w-5 h-5 ${
                                  isAck
                                    ? 'text-amber-500'
                                    : 'text-green-500'
                                }`}
                              />
                            ) : isAck ? (
                              <ShieldCheck className="w-5 h-5 text-amber-300 group-hover:text-amber-500 transition-colors" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {isVideo && (
                                <Video className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                              )}
                              {isAck && (
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}

                              <p
                                className={`text-sm font-medium ${
                                  isDone
                                    ? 'line-through text-gray-400'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                              >
                                <span className="text-gray-400 mr-1.5">
                                  {step.position}.
                                </span>
                                {step.title}
                              </p>
                            </div>

                            {!isAck &&
                              step.content &&
                              !isDone && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                                  {step.content}
                                </p>
                              )}

                            {isVideo &&
                              videoLink &&
                              !isDone && (
                                <a
                                  href={videoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) =>
                                    e.stopPropagation()
                                  }
                                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  Watch video
                                </a>
                              )}

                            {step.image_url && !isDone && (
                              <img
                                src={step.image_url}
                                alt={step.title}
                                className="mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 object-cover max-h-48"
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