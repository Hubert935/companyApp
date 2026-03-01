'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface Employee {
  id: string
  full_name: string | null
  email: string
}

interface AssignBundleModalProps {
  bundle: {
    id: string
    name: string
    sopIds: string[]
  }
  employees: Employee[]
  currentUserId: string
  onClose: () => void
}

export default function AssignBundleModal({ bundle, employees, currentUserId, onClose }: AssignBundleModalProps) {
  const router = useRouter()
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    if (selectedEmployeeIds.length === employees.length) {
      setSelectedEmployeeIds([])
    } else {
      setSelectedEmployeeIds(employees.map((e) => e.id))
    }
  }

  async function handleAssign() {
    if (selectedEmployeeIds.length === 0) { setError('Select at least one employee'); return }
    if (bundle.sopIds.length === 0) { setError('This bundle has no SOPs'); return }

    setAssigning(true)
    setError(null)
    const supabase = createClient()

    try {
      // Build assignment rows: one per (employee × SOP) pair
      // Use upsert to skip already-assigned combinations
      const rows = selectedEmployeeIds.flatMap((employee_id) =>
        bundle.sopIds.map((sop_id) => ({
          sop_id,
          employee_id,
          assigned_by: currentUserId,
          due_date: dueDate || null,
        }))
      )

      const { error: insertErr } = await supabase
        .from('assignments')
        .upsert(rows, { onConflict: 'sop_id,employee_id', ignoreDuplicates: true })

      if (insertErr) throw insertErr

      setSuccess(true)
      router.refresh()
      setTimeout(onClose, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign bundle')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Assign bundle</h2>
                <p className="text-sm text-gray-500">{bundle.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Assign {bundle.sopIds.length} SOP{bundle.sopIds.length !== 1 ? 's' : ''} to selected employees.
            </p>

            {/* Employee list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Employees
                </label>
                {employees.length > 1 && (
                  <button
                    onClick={toggleAll}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {selectedEmployeeIds.length === employees.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {employees.length === 0 ? (
                  <p className="text-sm text-gray-400 py-3 text-center">No team members yet</p>
                ) : (
                  employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {emp.full_name ?? emp.email}
                        </p>
                        {emp.full_name && (
                          <p className="text-xs text-gray-400">{emp.email}</p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm px-3 py-2 rounded-lg">
                Bundle assigned successfully!
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning || success}>
              <Package className="w-4 h-4" />
              {assigning ? 'Assigning…' : `Assign to ${selectedEmployeeIds.length || '—'} employee${selectedEmployeeIds.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
