'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Plus, CheckCircle2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

interface SOP {
  id: string
  title: string
}

interface Assignment {
  id: string
  sop_id: string
  employee_id: string
  completed_at: string | null
  due_date: string | null
}

interface EmployeeListProps {
  employees: Profile[]
  sops: SOP[]
  assignments: Assignment[]
  currentUserId: string
}

export default function EmployeeList({ employees, sops, assignments, currentUserId }: EmployeeListProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<Record<string, boolean>>({})

  function getEmployeeAssignments(employeeId: string) {
    return assignments.filter((a) => a.employee_id === employeeId)
  }

  function getUnassignedSOPs(employeeId: string) {
    const assigned = getEmployeeAssignments(employeeId).map((a) => a.sop_id)
    return sops.filter((s) => !assigned.includes(s.id))
  }

  async function assignSOP(employeeId: string, sopId: string) {
    const key = `${employeeId}-${sopId}`
    setAssigning((prev) => ({ ...prev, [key]: true }))

    const supabase = createClient()
    await supabase.from('assignments').insert({
      sop_id: sopId,
      employee_id: employeeId,
      assigned_by: currentUserId,
    })

    setAssigning((prev) => ({ ...prev, [key]: false }))
    router.refresh()
  }

  async function unassignSOP(assignmentId: string) {
    const supabase = createClient()
    await supabase.from('assignments').delete().eq('id', assignmentId)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900 dark:text-white">Team members ({employees.length})</h2>

      {employees.map((employee) => {
        const empAssignments = getEmployeeAssignments(employee.id)
        const completed = empAssignments.filter((a) => a.completed_at).length
        const total = empAssignments.length
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0
        const isExpanded = expanded === employee.id
        const unassigned = getUnassignedSOPs(employee.id)

        return (
          <div key={employee.id} className="bg-white dark:bg-blue-900/30 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
            {/* Employee header */}
            <button
              onClick={() => setExpanded(isExpanded ? null : employee.id)}
              className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 dark:text-white text-sm font-bold shrink-0">
                {getInitials(employee.full_name, employee.email)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {employee.full_name ?? employee.email}
                  </p>
                  <Badge variant={employee.role === 'manager' ? 'blue' : 'gray'}>
                    {employee.role}
                  </Badge>
                </div>
                {total > 0 ? (
                  <div className="flex items-center gap-3">
                    <ProgressBar value={progress} className="flex-1" />
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {completed}/{total} done
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No SOPs assigned</p>
                )}
              </div>

              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-4">
                {/* Assigned SOPs */}
                {empAssignments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Assigned SOPs
                    </p>
                    <ul className="space-y-2">
                      {empAssignments.map((a) => {
                        const sop = sops.find((s) => s.id === a.sop_id)
                        return (
                          <li key={a.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {a.completed_at ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                              )}
                              <span className="text-sm text-gray-700">{sop?.title ?? '—'}</span>
                            </div>
                            <button
                              onClick={() => unassignSOP(a.id)}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            >
                              Remove
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* Assign new SOPs */}
                {unassigned.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                      Assign SOP
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {unassigned.map((sop) => {
                        const key = `${employee.id}-${sop.id}`
                        return (
                          <button
                            key={sop.id}
                            onClick={() => assignSOP(employee.id, sop.id)}
                            disabled={assigning[key]}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            {sop.title}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {empAssignments.length === 0 && unassigned.length === 0 && sops.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Create some SOPs first, then assign them here.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
