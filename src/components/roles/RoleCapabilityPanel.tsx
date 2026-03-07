'use client'

import { useState } from 'react'
import { ShieldCheck, Shield, ShieldOff, AlertTriangle, Clock } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CertifyModal from '@/components/roles/CertifyModal'
import type { CertStatusRow, RoleCoverageRow } from '@/types/intelligence'
import { formatDate } from '@/lib/utils'
import type { CertStatus } from '@/types'

interface Props {
  certStatuses: CertStatusRow[]
  coverage: RoleCoverageRow
}

interface ModalState {
  employeeId: string
  employeeName: string
  mode: 'certify' | 'revoke'
}

const STATUS_ICON: Record<CertStatus, React.ReactNode> = {
  certified:            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />,
  pending_review:       <Shield className="w-4 h-4 text-orange-500 dark:text-orange-400" />,
  needs_recertification:<AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />,
  expired:              <ShieldOff className="w-4 h-4 text-red-600 dark:text-red-400" />,
  revoked:              <ShieldOff className="w-4 h-4 text-red-600 dark:text-red-400" />,
  in_training:          <Clock className="w-4 h-4 text-gray-400" />,
}

const STATUS_BADGE: Record<CertStatus, { variant: 'green' | 'orange' | 'red' | 'gray'; label: string }> = {
  certified:             { variant: 'green',  label: 'Certified' },
  pending_review:        { variant: 'orange', label: 'Pending review' },
  needs_recertification: { variant: 'orange', label: 'Needs re-certification' },
  expired:               { variant: 'red',    label: 'Expired' },
  revoked:               { variant: 'red',    label: 'Revoked' },
  in_training:           { variant: 'gray',   label: 'In training' },
}

export default function RoleCapabilityPanel({ certStatuses, coverage }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null)

  const coverageColor =
    coverage.is_spof || coverage.below_threshold
      ? 'text-red-600 dark:text-red-400'
      : coverage.expiring_30d > 0
        ? 'text-orange-600 dark:text-orange-400'
        : 'text-green-600 dark:text-green-400'

  if (certStatuses.length === 0) return null

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Header with coverage snapshot */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Capability status</h2>
          <span className={`text-sm font-semibold tabular-nums ${coverageColor}`}>
            {coverage.certified_count} certified
            {coverage.is_spof && <span className="ml-1 text-xs font-normal text-red-500">· SPOF</span>}
            {!coverage.is_spof && coverage.below_threshold && (
              <span className="ml-1 text-xs font-normal text-orange-500">
                · needs {coverage.minimum_certified_count - coverage.certified_count} more
              </span>
            )}
            {!coverage.below_threshold && !coverage.is_spof && (
              <span className="ml-1 text-xs font-normal text-green-600 dark:text-green-400">· Coverage met</span>
            )}
          </span>
        </div>

        {/* Employee rows */}
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {certStatuses.map((cs) => {
            const statusCfg = STATUS_BADGE[cs.cert_status]
            const icon = STATUS_ICON[cs.cert_status]
            const showCertifyBtn = cs.cert_status === 'pending_review' || cs.cert_status === 'needs_recertification' || cs.cert_status === 'expired'
            const showRevokeBtn  = cs.cert_status === 'certified' || cs.cert_status === 'needs_recertification'

            return (
              <li key={`${cs.employee_id}-${cs.role_id}`} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div className="min-w-0 flex-1">
                      {/* Name + status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {cs.employee_name ?? cs.employee_email}
                        </span>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>

                      {/* Certified by + expiry */}
                      {cs.cert_status === 'certified' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Certified {cs.certified_at ? formatDate(cs.certified_at) : '—'}
                          {cs.certified_by_name && ` by ${cs.certified_by_name}`}
                          {cs.expires_at
                            ? <span className={cs.expiring_critical ? 'text-red-600 dark:text-red-400 ml-1 font-medium' : cs.expiring_warning ? 'text-orange-500 dark:text-orange-400 ml-1' : 'ml-1'}>
                                · Expires {formatDate(cs.expires_at)}{cs.days_until_expiry !== null && cs.days_until_expiry <= 30 ? ` (${cs.days_until_expiry}d)` : ''}
                              </span>
                            : <span className="text-gray-400 dark:text-gray-600 ml-1">· No expiry</span>
                          }
                        </p>
                      )}

                      {/* Drift warning */}
                      {cs.cert_status === 'needs_recertification' && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                          Role SOPs changed since certification
                          {cs.added_sop_ids.length > 0 && ` — ${cs.added_sop_ids.length} SOP${cs.added_sop_ids.length !== 1 ? 's' : ''} added`}
                          {cs.removed_sop_ids.length > 0 && ` · ${cs.removed_sop_ids.length} SOP${cs.removed_sop_ids.length !== 1 ? 's' : ''} removed`}
                        </p>
                      )}

                      {/* Pending review */}
                      {cs.cert_status === 'pending_review' && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                          Training completed {cs.training_completed_at ? formatDate(cs.training_completed_at) : '—'} — awaiting certification
                        </p>
                      )}

                      {/* In training */}
                      {cs.cert_status === 'in_training' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Assigned {cs.assigned_at ? formatDate(cs.assigned_at) : '—'} — training in progress
                        </p>
                      )}

                      {/* Revoked */}
                      {cs.cert_status === 'revoked' && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                          Revoked {cs.revoked_at ? formatDate(cs.revoked_at) : '—'}
                          {cs.revocation_reason && ` — ${cs.revocation_reason}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 shrink-0">
                    {showCertifyBtn && (
                      <Button
                        size="sm"
                        onClick={() => setModal({
                          employeeId: cs.employee_id,
                          employeeName: cs.employee_name ?? cs.employee_email,
                          mode: 'certify',
                        })}
                      >
                        {cs.cert_status === 'needs_recertification' ? 'Re-certify' : 'Certify'}
                      </Button>
                    )}
                    {showRevokeBtn && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setModal({
                          employeeId: cs.employee_id,
                          employeeName: cs.employee_name ?? cs.employee_email,
                          mode: 'revoke',
                        })}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {modal && (
        <CertifyModal
          employeeId={modal.employeeId}
          employeeName={modal.employeeName}
          roleId={certStatuses[0].role_id}
          roleName={certStatuses[0].role_name}
          mode={modal.mode}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
