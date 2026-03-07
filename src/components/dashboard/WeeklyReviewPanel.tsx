'use client'

import { useState } from 'react'
import { ShieldCheck, AlertTriangle, Shield, Users, CheckCircle2, Clock } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CertifyModal from '@/components/roles/CertifyModal'
import type { CertStatusRow, ExpiryRiskRow, RoleCoverageRow } from '@/types/intelligence'
import { formatDate } from '@/lib/utils'

interface Props {
  certStatuses: CertStatusRow[]
  expiryRisk: ExpiryRiskRow[]
  roleCoverage: RoleCoverageRow[]
}

interface ModalState {
  employeeId: string
  employeeName: string
  roleId: string
  roleName: string
  mode: 'certify' | 'revoke'
}

// Days since a date string
function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function WeeklyReviewPanel({ certStatuses, expiryRisk, roleCoverage }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null)

  // Section 1: Action items
  const pendingReview = certStatuses.filter(
    (cs) => cs.cert_status === 'pending_review' && daysSince(cs.training_completed_at ?? cs.assigned_at) >= 3
  )
  const expiring30d = expiryRisk.filter((e) => e.expiry_window !== '60d' || e.is_spof)

  // Section 2: Drift report
  const drifted = certStatuses.filter((cs) => cs.cert_status === 'needs_recertification')

  // Section 3: Coverage status (sort worst first)
  const coverageSorted = [...roleCoverage].sort((a, b) => a.coverage_pct - b.coverage_pct)

  // Section 4: In training — grouped by role
  const inTraining = certStatuses.filter((cs) => cs.cert_status === 'in_training')

  const hasActionItems = pendingReview.length > 0 || expiring30d.length > 0
  const hasDrift = drifted.length > 0
  const hasInTraining = inTraining.length > 0

  return (
    <>
      <div className="space-y-6">
        {/* Section 1: Action Items */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Action items</h2>
            {hasActionItems && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                {pendingReview.length + expiring30d.length}
              </span>
            )}
          </div>
          <div className="p-6">
            {!hasActionItems ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No action items this week.</p>
            ) : (
              <div className="space-y-2">
                {pendingReview.map((cs) => (
                  <div
                    key={`${cs.employee_id}-${cs.role_id}`}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {cs.employee_name ?? cs.employee_email}
                        <span className="text-gray-400 mx-1">—</span>
                        <span className="text-gray-700 dark:text-gray-300">{cs.role_name}</span>
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                        Training completed {daysSince(cs.training_completed_at!)} days ago — awaiting certification
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setModal({
                        employeeId: cs.employee_id,
                        employeeName: cs.employee_name ?? cs.employee_email,
                        roleId: cs.role_id,
                        roleName: cs.role_name,
                        mode: 'certify',
                      })}
                    >
                      Certify
                    </Button>
                  </div>
                ))}
                {expiring30d.map((e) => (
                  <div
                    key={`exp-${e.employee_id}-${e.role_id}`}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {e.employee_name ?? e.employee_email}
                        <span className="text-gray-400 mx-1">—</span>
                        <span className="text-gray-700 dark:text-gray-300">{e.role_name}</span>
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                        Expires {formatDate(e.expires_at)} · {e.days_until_expiry} days remaining
                        {e.is_spof && <span className="text-red-600 dark:text-red-400 ml-1">· Only certified person</span>}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setModal({
                        employeeId: e.employee_id,
                        employeeName: e.employee_name ?? e.employee_email,
                        roleId: e.role_id,
                        roleName: e.role_name,
                        mode: 'certify',
                      })}
                    >
                      Re-certify
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Drift Report */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Certification drift</h2>
            {hasDrift && (
              <span className="ml-auto text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full font-medium">
                {drifted.length}
              </span>
            )}
          </div>
          <div className="p-6">
            {!hasDrift ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No certification drift detected.</p>
            ) : (
              <div className="space-y-3">
                {drifted.map((cs) => (
                  <div
                    key={`drift-${cs.employee_id}-${cs.role_id}`}
                    className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {cs.employee_name ?? cs.employee_email}
                          <span className="text-gray-400 mx-1">—</span>
                          {cs.role_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Certified {cs.certified_at ? formatDate(cs.certified_at) : 'unknown'}
                          {cs.certified_by_name && ` by ${cs.certified_by_name}`}
                        </p>
                        {(cs.added_sop_ids.length > 0 || cs.removed_sop_ids.length > 0) && (
                          <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                            {cs.added_sop_ids.length > 0 && `${cs.added_sop_ids.length} SOP${cs.added_sop_ids.length !== 1 ? 's' : ''} added`}
                            {cs.added_sop_ids.length > 0 && cs.removed_sop_ids.length > 0 && ' · '}
                            {cs.removed_sop_ids.length > 0 && `${cs.removed_sop_ids.length} SOP${cs.removed_sop_ids.length !== 1 ? 's' : ''} removed`}
                            {' '}since certification
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => setModal({
                            employeeId: cs.employee_id,
                            employeeName: cs.employee_name ?? cs.employee_email,
                            roleId: cs.role_id,
                            roleName: cs.role_name,
                            mode: 'certify',
                          })}
                        >
                          Re-certify
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setModal({
                            employeeId: cs.employee_id,
                            employeeName: cs.employee_name ?? cs.employee_email,
                            roleId: cs.role_id,
                            roleName: cs.role_name,
                            mode: 'revoke',
                          })}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Coverage Status */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Coverage status</h2>
          </div>
          <div className="p-6">
            {roleCoverage.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No roles defined yet.</p>
            ) : (
              <div className="space-y-2">
                {coverageSorted.map((role) => {
                  const statusColor =
                    role.is_spof || role.below_threshold
                      ? 'text-red-600 dark:text-red-400'
                      : role.expiring_30d > 0
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-green-600 dark:text-green-400'
                  return (
                    <div
                      key={role.role_id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-200">{role.role_name}</span>
                      <span className={`text-xs font-medium tabular-nums ${statusColor}`}>
                        {role.certified_count}/{role.minimum_certified_count} certified
                        {role.is_spof && ' · SPOF'}
                        {!role.is_spof && role.below_threshold && ' · Below threshold'}
                        {!role.below_threshold && role.expiring_30d > 0 && ` · ${role.expiring_30d} expiring`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Training Pipeline */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <Clock className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Training pipeline</h2>
          </div>
          <div className="p-6">
            {!hasInTraining ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No employees currently in training.</p>
            ) : (
              <div className="space-y-2">
                {inTraining.map((cs) => {
                  const days = daysSince(cs.assigned_at)
                  const isStalled = days > 14
                  return (
                    <div
                      key={`train-${cs.employee_id}-${cs.role_id}`}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {cs.employee_name ?? cs.employee_email}
                          <span className="text-gray-400 mx-1">—</span>
                          <span className="text-gray-700 dark:text-gray-300">{cs.role_name}</span>
                        </p>
                        <p className={`text-xs mt-0.5 ${isStalled ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {isStalled ? `Stalled — ${days} days since assignment` : `${days} day${days !== 1 ? 's' : ''} in training`}
                        </p>
                      </div>
                      {isStalled && <Badge variant="orange">Stalled</Badge>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <CertifyModal
          employeeId={modal.employeeId}
          employeeName={modal.employeeName}
          roleId={modal.roleId}
          roleName={modal.roleName}
          mode={modal.mode}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
