import Link from 'next/link'
import { AlertTriangle, Users } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { RoleCoverageRow } from '@/types/intelligence'

interface Props {
  role: RoleCoverageRow
}

const COLOR_ICON: Record<string, string> = {
  blue:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  green:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  red:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  gray:   'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
}

export default function RoleCoverageCard({ role }: Props) {
  const isBad  = role.is_spof || role.below_threshold
  const isWarn = !isBad && role.expiring_30d > 0
  const isGood = !isBad && !isWarn

  // Coverage bar width (0–100)
  const coveragePct = Math.min(100, Math.round(role.coverage_pct))
  const barColor = isBad ? 'bg-red-500' : isWarn ? 'bg-orange-400' : 'bg-green-500'

  const iconClass = COLOR_ICON[role.color] ?? COLOR_ICON.gray

  return (
    <Link
      href={`/roles/${role.role_id}`}
      className="block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{role.role_name}</h3>
          {role.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
              {role.description}
            </p>
          )}
        </div>
      </div>

      {/* Risk tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {role.is_spof && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Single point of failure
          </span>
        )}
        {!role.is_spof && role.below_threshold && (
          <span className="text-xs font-medium text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
            Needs more certified staff
          </span>
        )}
        {isWarn && (
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-full">
            {role.expiring_30d} expiring in 30 days
          </span>
        )}
      </div>

      {/* Coverage bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Coverage</span>
          <span className={`font-semibold tabular-nums ${isBad ? 'text-red-600 dark:text-red-400' : isWarn ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
            {role.certified_count} / {role.minimum_certified_count} certified
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${coveragePct}%` }}
          />
        </div>
      </div>

      {/* Stat row */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        {role.pending_count > 0 && (
          <Badge variant="orange">{role.pending_count} pending review</Badge>
        )}
        {role.in_training_count > 0 && (
          <Badge variant="gray">{role.in_training_count} in training</Badge>
        )}
        {role.drifted_count > 0 && (
          <Badge variant="orange">{role.drifted_count} drifted</Badge>
        )}
        {isGood && role.certified_count > 0 && (
          <Badge variant="green">Coverage met</Badge>
        )}
      </div>
    </Link>
  )
}
