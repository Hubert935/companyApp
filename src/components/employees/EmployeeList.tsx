'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDown, ChevronUp, Plus, CheckCircle2, Clock,
  ShieldCheck, AlertTriangle, Shield, ShieldOff,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import Button from '@/components/ui/Button'
import CertifyModal from '@/components/roles/CertifyModal'
import EmployeeCapabilityProfile from '@/components/employees/EmployeeCapabilityProfile'
import { getInitials } from '@/lib/utils'
import { getCertStatus } from '@/types'
import type { Profile, CertStatus } from '@/types'
import type { BadgeVariant as BV } from '@/components/ui/Badge'
import type { CertStatusRow } from '@/types/intelligence'

interface SOPItem {
  id: string
  title: string
}

interface RoleWithSOPs {
  id: string
  name: string
  color: string
  minimum_certified_count?: number
  role_sops: { sop_id: string; position: number }[]
}

interface EmployeeRoleRow {
  employee_id: string
  role_id: string
  training_completed_at: string | null
  certified_at: string | null
  certified_by: string | null
  expires_at: string | null
  role_snapshot: unknown
  revoked_at: string | null
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
  sops: SOPItem[]
  assignments: Assignment[]
  roles: RoleWithSOPs[]
  employeeRoles: EmployeeRoleRow[]
  certStatuses: CertStatusRow[]
  currentUserId: string
}

const CERT_STATUS_UI: Record<CertStatus, { label: string; variant: BV; icon: React.ComponentType<{ className?: string }> }> = {
  certified:            { label: 'Certified',       variant: 'green',  icon: ShieldCheck },
  pending_review:       { label: 'Pending review',  variant: 'orange', icon: Shield },
  needs_recertification:{ label: 'Needs re-cert',   variant: 'red',    icon: AlertTriangle },
  expired:              { label: 'Expired',          variant: 'red',    icon: ShieldOff },
  revoked:              { label: 'Revoked',          variant: 'red',    icon: ShieldOff },
  in_training:          { label: 'In training',      variant: 'gray',   icon: Shield },
}

export default function EmployeeList({
  employees, sops, assignments, roles, employeeRoles, certStatuses, currentUserId,
}: EmployeeListProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<Record<string, boolean>>({})
  const [certModal, setCertModal] = useState<{
    employeeId: string
    employeeName: string
    roleId: string
    roleName: string
    mode: 'certify' | 'revoke'
  } | null>(null)

  function getEmpAssignments(employeeId: string) {
    return assignments.filter((a) => a.employee_id === employeeId)
  }

  function getUnassignedSOPs(employeeId: string) {
    const assigned = getEmpAssignments(employeeId).map((a) => a.sop_id)
    return sops.filter((s) => !assigned.includes(s.id))
  }

  function getEmpRoles(employeeId: string) {
    return employeeRoles.filter((er) => er.employee_id === employeeId)
  }

  function getUnassignedRoles(employeeId: string) {
    const assigned = getEmpRoles(employeeId).map((er) => er.role_id)
    return roles.filter((r) => !assigned.includes(r.id))
  }

  function getEmpCertStatuses(employeeId: string): CertStatusRow[] {
    return certStatuses.filter((cs) => cs.employee_id === employeeId)
  }

  async function assignSOP(employeeId: string, sopId: string) {
    const key = `${employeeId}-${sopId}`
    setAssigning((prev) => ({ ...prev, [key]: true }))
    const supabase = createClient()
    await supabase.from('assignments').insert({
      sop_id: sopId, employee_id: employeeId, assigned_by: currentUserId,
    })
    setAssigning((prev) => ({ ...prev, [key]: false }))
    router.refresh()
  }

  async function unassignSOP(assignmentId: string) {
    const supabase = createClient()
    await supabase.from('assignments').delete().eq('id', assignmentId)
    router.refresh()
  }

  async function assignRole(employeeId: string, role: RoleWithSOPs) {
    const key = `role-${employeeId}-${role.id}`
    setAssigning((prev) => ({ ...prev, [key]: true }))
    const supabase = createClient()

    await supabase.from('employee_roles').upsert(
      { employee_id: employeeId, role_id: role.id, assigned_by: currentUserId },
      { onConflict: 'employee_id,role_id', ignoreDuplicates: true }
    )

    const alreadyAssigned = getEmpAssignments(employeeId).map((a) => a.sop_id)
    const toAssign = (role.role_sops ?? [])
      .filter((rs) => !alreadyAssigned.includes(rs.sop_id))
      .map((rs) => ({ sop_id: rs.sop_id, employee_id: employeeId, assigned_by: currentUserId }))

    if (toAssign.length > 0) {
      await supabase.from('assignments').upsert(toAssign, {
        onConflict: 'sop_id,employee_id', ignoreDuplicates: true,
      })
    }

    setAssigning((prev) => ({ ...prev, [key]: false }))
    router.refresh()
  }

  async function removeRole(employeeId: string, roleId: string) {
    const supabase = createClient()
    await supabase.from('employee_roles')
      .delete()
      .eq('employee_id', employeeId)
      .eq('role_id', roleId)
    router.refresh()
  }

  return (
    <>
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Team members ({employees.length})
        </h2>

        {employees.map((employee) => {
          const empAssignments   = getEmpAssignments(employee.id)
          const completed        = empAssignments.filter((a) => a.completed_at).length
          const total            = empAssignments.length
          const progress         = total > 0 ? Math.round((completed / total) * 100) : 0
          const isExpanded       = expanded === employee.id
          const unassigned       = getUnassignedSOPs(employee.id)
          const empRoles         = getEmpRoles(employee.id)
          const unassignedRoles  = getUnassignedRoles(employee.id)
          const empCertStatuses  = getEmpCertStatuses(employee.id)

          return (
            <div
              key={employee.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : employee.id)}
                className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-700 dark:text-purple-300 text-sm font-bold shrink-0">
                  {getInitials(employee.full_name, employee.email)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {employee.full_name ?? employee.email}
                    </p>
                    <Badge variant={employee.role === 'manager' ? 'blue' : 'gray'}>
                      {employee.role}
                    </Badge>
                    {/* Cert status badges from intelligence view (richer data) */}
                    {empCertStatuses.length > 0
                      ? empCertStatuses
                          .filter((cs) => cs.cert_status !== 'in_training')
                          .map((cs) => {
                            const ui = CERT_STATUS_UI[cs.cert_status]
                            return (
                              <Badge key={cs.role_id} variant={ui.variant}>
                                {cs.role_name}: {ui.label}
                              </Badge>
                            )
                          })
                      : empRoles.map((er) => {
                          // Fallback to local getCertStatus if v_cert_status data isn't available
                          const role = roles.find((r) => r.id === er.role_id)
                          if (!role) return null
                          const sopIds = (role.role_sops ?? []).map((rs) => rs.sop_id)
                          const status = getCertStatus(
                            {
                              revoked_at: er.revoked_at,
                              certified_at: er.certified_at,
                              expires_at: er.expires_at,
                              role_snapshot: er.role_snapshot as Parameters<typeof getCertStatus>[0]['role_snapshot'],
                              training_completed_at: er.training_completed_at,
                            },
                            sopIds
                          )
                          const ui = CERT_STATUS_UI[status]
                          if (status === 'in_training') return null
                          return (
                            <Badge key={er.role_id} variant={ui.variant}>
                              {role.name}: {ui.label}
                            </Badge>
                          )
                        })
                    }
                  </div>
                  {total > 0 ? (
                    <div className="flex items-center gap-3">
                      <ProgressBar value={progress} className="flex-1" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
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

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-5 space-y-5">

                  {/* ── Capability Profile (uses intelligence view data) ── */}
                  {empCertStatuses.length > 0 ? (
                    <EmployeeCapabilityProfile certStatuses={empCertStatuses} />
                  ) : (
                    /* Fallback: old simple role display if view data unavailable */
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                        Roles & Capability
                      </p>
                      {empRoles.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {empRoles.map((er) => {
                            const role = roles.find((r) => r.id === er.role_id)
                            if (!role) return null
                            const sopIds = (role.role_sops ?? []).map((rs) => rs.sop_id)
                            const status = getCertStatus(
                              {
                                revoked_at: er.revoked_at,
                                certified_at: er.certified_at,
                                expires_at: er.expires_at,
                                role_snapshot: er.role_snapshot as Parameters<typeof getCertStatus>[0]['role_snapshot'],
                                training_completed_at: er.training_completed_at,
                              },
                              sopIds
                            )
                            const ui = CERT_STATUS_UI[status]
                            const Icon = ui.icon
                            return (
                              <div
                                key={er.role_id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon className="w-4 h-4 shrink-0 text-gray-400" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                      {role.name}
                                    </p>
                                    <Badge variant={ui.variant}>{ui.label}</Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  {status === 'pending_review' && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        setCertModal({
                                          employeeId: employee.id,
                                          employeeName: employee.full_name ?? employee.email,
                                          roleId: role.id,
                                          roleName: role.name,
                                          mode: 'certify',
                                        })
                                      }
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      Certify
                                    </Button>
                                  )}
                                  {(status === 'certified' || status === 'needs_recertification') && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        setCertModal({
                                          employeeId: employee.id,
                                          employeeName: employee.full_name ?? employee.email,
                                          roleId: role.id,
                                          roleName: role.name,
                                          mode: 'revoke',
                                        })
                                      }
                                    >
                                      Revoke
                                    </Button>
                                  )}
                                  <button
                                    onClick={() => removeRole(employee.id, role.id)}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remove role / Assign role buttons */}
                  <div className="flex flex-wrap gap-2">
                    {empCertStatuses.map((cs) => (
                      <button
                        key={cs.role_id}
                        onClick={() => removeRole(employee.id, cs.role_id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        Remove {cs.role_name}
                      </button>
                    ))}
                    {unassignedRoles.map((role) => {
                      const key = `role-${employee.id}-${role.id}`
                      return (
                        <button
                          key={role.id}
                          onClick={() => assignRole(employee.id, role)}
                          disabled={assigning[key]}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Assign {role.name}
                        </button>
                      )
                    })}
                    {roles.length === 0 && (
                      <p className="text-xs text-gray-400">
                        No roles defined yet.{' '}
                        <a href="/roles/new" className="text-blue-500 hover:underline">Create a role first.</a>
                      </p>
                    )}
                  </div>

                  {/* ── Assigned SOPs ── */}
                  {empAssignments.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
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
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {sop?.title ?? '—'}
                                </span>
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

                  {/* ── Assign individual SOP ── */}
                  {unassigned.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
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
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              {sop.title}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {empAssignments.length === 0 && unassigned.length === 0 && sops.length === 0 && empRoles.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Assign a role above to get started, or create SOPs first.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {certModal && (
        <CertifyModal
          employeeId={certModal.employeeId}
          employeeName={certModal.employeeName}
          roleId={certModal.roleId}
          roleName={certModal.roleName}
          mode={certModal.mode}
          onClose={() => setCertModal(null)}
        />
      )}
    </>
  )
}
