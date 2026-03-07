import type { CompanyHealthRow } from '@/types/intelligence'
import ProgressBar from '@/components/ui/ProgressBar'
import Link from 'next/link'

interface Props {
  data: CompanyHealthRow
}

const gradeConfig = {
  healthy: {
    label: 'Healthy',
    scoreColor: 'text-green-600 dark:text-green-400',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    barColor: 'bg-green-500',
  },
  needs_attention: {
    label: 'Needs Attention',
    scoreColor: 'text-orange-500 dark:text-orange-400',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    barColor: 'bg-orange-500',
  },
  at_risk: {
    label: 'At Risk',
    scoreColor: 'text-red-600 dark:text-red-400',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    barColor: 'bg-red-500',
  },
} as const

function ComponentBar({
  label,
  score,
  description,
  href,
}: {
  label: string
  score: number      // 0.0–1.0
  description: string
  href: string
}) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 80 ? 'text-green-600 dark:text-green-400' :
    pct >= 60 ? 'text-orange-500 dark:text-orange-400' :
                'text-red-600 dark:text-red-400'

  return (
    <Link href={href} className="group block">
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs font-medium text-gray-600 dark:text-gray-400 shrink-0">
          {label}
        </span>
        <div className="flex-1">
          <ProgressBar value={pct} />
        </div>
        <span className={`w-10 text-right text-sm font-semibold tabular-nums ${color}`}>
          {pct}%
        </span>
        <span className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 w-48 truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
          {description}
        </span>
      </div>
    </Link>
  )
}

export default function OperationalHealthWidget({ data }: Props) {
  const cfg = gradeConfig[data.health_grade]
  const score = Math.round(data.health_score)

  const coverageDesc =
    data.total_roles === 0
      ? 'No roles defined'
      : `${data.covered_roles} of ${data.total_roles} role${data.total_roles !== 1 ? 's' : ''} covered`

  const currencyDesc =
    data.total_active_certs === 0
      ? 'No active certifications'
      : data.current_certs === data.total_active_certs
        ? 'All certs current'
        : `${data.total_active_certs - data.current_certs} cert${data.total_active_certs - data.current_certs !== 1 ? 's' : ''} need re-certification`

  const driftDesc =
    data.drifted_count === 0
      ? 'No certification drift'
      : `${data.drifted_count} employee${data.drifted_count !== 1 ? 's' : ''} need re-certification`

  const expiryDesc =
    data.expiring_critical_count === 0
      ? 'No critical expirations'
      : `${data.expiring_critical_count} expiring within 7 days`

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Operational Health
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Coverage · Currency · Drift · Expiry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-4xl font-bold tabular-nums ${cfg.scoreColor}`}>
            {score}
          </span>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.badgeClass}`}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Component bars */}
      <div className="space-y-3">
        <ComponentBar
          label="Coverage"
          score={data.coverage_score}
          description={coverageDesc}
          href="/roles"
        />
        <ComponentBar
          label="Currency"
          score={data.currency_score}
          description={currencyDesc}
          href="/employees"
        />
        <ComponentBar
          label="Drift"
          score={data.drift_score}
          description={driftDesc}
          href="/employees"
        />
        <ComponentBar
          label="Expiry"
          score={data.expiry_score}
          description={expiryDesc}
          href="/dashboard"
        />
      </div>
    </div>
  )
}
