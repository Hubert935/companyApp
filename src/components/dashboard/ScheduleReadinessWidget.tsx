import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export interface ScheduleConflict {
  employee_name: string
  role_name: string
  shift_date: string
  cert_status: string
}

interface ScheduleReadinessWidgetProps {
  conflicts: ScheduleConflict[]
  totalShifts: number
}

const STATUS_LABELS: Record<string, string> = {
  expired:              'Expired',
  revoked:              'Revoked',
  needs_recertification: 'Needs recert',
  pending_review:       'Pending review',
  in_training:          'In training',
  not_assigned:         'Not assigned',
}

export default function ScheduleReadinessWidget({ conflicts, totalShifts }: ScheduleReadinessWidgetProps) {
  const cleanShifts = totalShifts - conflicts.length
  const pct = totalShifts > 0 ? Math.round((cleanShifts / totalShifts) * 100) : 100

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Schedule Readiness</h3>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          conflicts.length === 0
            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
        }`}>
          {conflicts.length === 0 ? 'All clear' : `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{cleanShifts} of {totalShifts} shifts certified</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {conflicts.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          All scheduled employees are certified for this week.
        </div>
      ) : (
        <div className="space-y-2">
          {conflicts.slice(0, 5).map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <span className="font-medium text-gray-900 dark:text-white truncate">{c.employee_name}</span>
                <span className="text-gray-400 dark:text-gray-500"> · {c.role_name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(c.shift_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400 font-medium">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {STATUS_LABELS[c.cert_status] ?? c.cert_status}
                </span>
              </div>
            </div>
          ))}
          {conflicts.length > 5 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              +{conflicts.length - 5} more conflicts
            </p>
          )}
          <Link
            href="/employees"
            className="inline-block mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Fix certifications →
          </Link>
        </div>
      )}
    </div>
  )
}
