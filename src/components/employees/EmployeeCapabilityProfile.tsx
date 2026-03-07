'use client'

import { useState } from 'react'
import { ShieldCheck, Shield, ShieldOff, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CertifyModal from '@/components/roles/CertifyModal'
import type { CertStatusRow } from '@/types/intelligence'
import type { CertStatus } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props {
  certStatuses: CertStatusRow[]   // all roles for this employee
}

interface ModalState {
  roleId: string
  roleName: string
  mode: 'certify' | 'revoke'
}

const COLOR_DOT: Record<string, string> = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  red:    'bg-red-500',
  gray:   'bg-gray-400',
}

const STATUS_CONFIG: Record<CertStatus, {
  icon: React.ReactNode
  badge: { variant: 'green' | 'orange' | 'red' | 'gray'; label: string }
}> = {
  certified:             {
    icon: <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />,
    badge: { variant: 'green',  label: 'Certified' },
  },
  pending_review:        {
    icon: <Shield className="w-4 h-4 text-orange-500 dark:text-orange-400" />,
    badge: { variant: 'orange', label: 'Pending review' },
  },
  needs_recertification: {
    icon: <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />,
    badge: { variant: 'orange', label: 'Needs re-certification' },
  },
  expired:               {
    icon: <ShieldOff className="w-4 h-4 text-red-600 dark:text-red-400" />,
    badge: { variant: 'red',    label: 'Expired' },
  },
  revoked:               {
    icon: <ShieldOff className="w-4 h-4 text-red-600 dark:text-red-400" />,
    badge: { variant: 'red',    label: 'Revoked' },
  },
  in_training:           {
    icon: <Clock className="w-4 h-4 text-gray-400" />,
    badge: { variant: 'gray',   label: 'In training' },
  },
}

function RoleCapabilityRow({
  cs,
  onAction,
}: {
  cs: CertStatusRow
  onAction: (roleId: string, roleName: string, mode: 'certify' | 'revoke') => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  const cfg = STATUS_CONFIG[cs.cert_status]
  const dotColor = COLOR_DOT[cs.role_color] ?? COLOR_DOT.gray

  const showCertifyBtn = ['pending_review', 'needs_recertification', 'expired'].includes(cs.cert_status)
  const showRevokeBtn  = ['certified', 'needs_recertification'].includes(cs.cert_status)

  // Build timeline events
  const events: { label: string; date: string | null; color: string }[] = [
    { label: 'Assigned', date: cs.assigned_at, color: 'bg-gray-400' },
  ]
  if (cs.training_completed_at) {
    events.push({ label: 'Training complete', date: cs.training_completed_at, color: 'bg-blue-400' })
  }
  if (cs.certified_at) {
    events.push({
      label: `Certified by ${cs.certified_by_name ?? 'manager'}`,
      date: cs.certified_at,
      color: 'bg-green-500',
    })
  }
  if (cs.revoked_at) {
    events.push({
      label: `Revoked${cs.revocation_reason ? ` — ${cs.revocation_reason}` : ''}`,
      date: cs.revoked_at,
      color: 'bg-red-500',
    })
  }

  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Main row */}
      <div className="flex items-start gap-3">
        {/* Role color dot */}
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />

        <div className="flex-1 min-w-0">
          {/* Role name + status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {cs.role_name}
            </span>
            <Badge variant={cfg.badge.variant}>{cfg.badge.label}</Badge>
            <span className="ml-auto shrink-0">{cfg.icon}</span>
          </div>

          {/* Status detail */}
          {cs.cert_status === 'certified' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Certified {cs.certified_at ? formatDate(cs.certified_at) : '—'}
              {cs.certified_by_name && ` by ${cs.certified_by_name}`}
              {cs.expires_at ? (
                <span className={
                  cs.expiring_critical
                    ? ' · text-red-600 dark:text-red-400 font-medium'
                    : cs.expiring_warning
                      ? ' · text-orange-500 dark:text-orange-400'
                      : ''
                }>
                  {' '}· Expires {formatDate(cs.expires_at)}
                  {cs.days_until_expiry !== null && cs.days_until_expiry <= 30 && ` (${cs.days_until_expiry} days)`}
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-600"> · No expiry</span>
              )}
            </p>
          )}
          {cs.cert_status === 'needs_recertification' && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
              Role SOPs changed since certification
              {cs.added_sop_ids.length > 0 && ` — ${cs.added_sop_ids.length} SOP${cs.added_sop_ids.length !== 1 ? 's' : ''} added`}
              {cs.removed_sop_ids.length > 0 && ` · ${cs.removed_sop_ids.length} SOP${cs.removed_sop_ids.length !== 1 ? 's' : ''} removed`}
            </p>
          )}
          {cs.cert_status === 'pending_review' && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
              Training completed {cs.training_completed_at ? formatDate(cs.training_completed_at) : '—'} — awaiting certification
            </p>
          )}
          {cs.cert_status === 'in_training' && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Assigned {cs.assigned_at ? formatDate(cs.assigned_at) : '—'}
            </p>
          )}
          {cs.cert_status === 'expired' && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Expired {cs.expires_at ? formatDate(cs.expires_at) : '—'}
              {cs.certified_by_name && ` — originally certified by ${cs.certified_by_name}`}
            </p>
          )}
          {cs.cert_status === 'revoked' && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Revoked {cs.revoked_at ? formatDate(cs.revoked_at) : '—'}
              {cs.revocation_reason && ` — ${cs.revocation_reason}`}
            </p>
          )}

          {/* Action buttons */}
          {(showCertifyBtn || showRevokeBtn) && (
            <div className="flex gap-2 mt-2">
              {showCertifyBtn && (
                <Button
                  size="sm"
                  onClick={() => onAction(cs.role_id, cs.role_name, 'certify')}
                >
                  {cs.cert_status === 'needs_recertification' ? 'Re-certify' : 'Certify now'}
                </Button>
              )}
              {showRevokeBtn && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onAction(cs.role_id, cs.role_name, 'revoke')}
                >
                  Revoke
                </Button>
              )}
            </div>
          )}

          {/* Authority trail toggle */}
          {events.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mt-1.5 transition-colors"
            >
              {showHistory ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              View history
            </button>
          )}

          {/* Authority trail */}
          {showHistory && (
            <ol className="mt-2 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
              {events.map((ev, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1 -ml-[5px] shrink-0 ${ev.color}`} />
                  <div className="min-w-0">
                    <span className="text-xs text-gray-700 dark:text-gray-300">{ev.label}</span>
                    {ev.date && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">
                        {formatDate(ev.date)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EmployeeCapabilityProfile({ certStatuses }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null)

  if (certStatuses.length === 0) return null

  function handleAction(roleId: string, roleName: string, mode: 'certify' | 'revoke') {
    setModal({ roleId, roleName, mode })
  }

  const employeeId   = certStatuses[0].employee_id
  const employeeName = certStatuses[0].employee_name ?? certStatuses[0].employee_email

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
          Roles & Capability
        </p>
        <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 px-3">
          {certStatuses.map((cs) => (
            <RoleCapabilityRow
              key={`${cs.employee_id}-${cs.role_id}`}
              cs={cs}
              onAction={handleAction}
            />
          ))}
        </div>
      </div>

      {modal && (
        <CertifyModal
          employeeId={employeeId}
          employeeName={employeeName}
          roleId={modal.roleId}
          roleName={modal.roleName}
          mode={modal.mode}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
