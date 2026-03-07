'use client'

import { useState } from 'react'
import { AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import CertifyModal from '@/components/roles/CertifyModal'
import type { ExpiryRiskRow } from '@/types/intelligence'

interface Props {
  items: ExpiryRiskRow[]
}

interface ModalState {
  employeeId: string
  employeeName: string
  roleId: string
  roleName: string
}

function AlertItem({ item, onCertify }: { item: ExpiryRiskRow; onCertify: (item: ExpiryRiskRow) => void }) {
  const isCritical = item.expiry_window === '7d'
  const days = item.days_until_expiry

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
        isCritical
          ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
          : 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.employee_name ?? item.employee_email}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">{item.role_name}</span>
          {item.is_spof && (
            <Badge variant="red">Only certified person</Badge>
          )}
        </div>
        <p className={`text-xs mt-0.5 font-medium ${
          isCritical
            ? 'text-red-700 dark:text-red-400'
            : 'text-orange-700 dark:text-orange-400'
        }`}>
          Expires in {days} day{days !== 1 ? 's' : ''}
          {item.certified_by_name && (
            <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
              · Certified by {item.certified_by_name}
            </span>
          )}
        </p>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => onCertify(item)}
        className="ml-3 shrink-0"
      >
        Re-certify
      </Button>
    </div>
  )
}

function Group({
  title,
  items,
  defaultOpen = true,
  onCertify,
  accent,
}: {
  title: string
  items: ExpiryRiskRow[]
  defaultOpen?: boolean
  onCertify: (item: ExpiryRiskRow) => void
  accent: 'red' | 'orange' | 'gray'
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (items.length === 0) return null

  const accentClass = {
    red: 'text-red-700 dark:text-red-400',
    orange: 'text-orange-600 dark:text-orange-400',
    gray: 'text-gray-600 dark:text-gray-400',
  }[accent]

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2 hover:opacity-80 transition-opacity"
      >
        {open ? (
          <ChevronDown className={`w-3.5 h-3.5 ${accentClass}`} />
        ) : (
          <ChevronRight className={`w-3.5 h-3.5 ${accentClass}`} />
        )}
        <span className={accentClass}>{title}</span>
        <span className="text-gray-400 dark:text-gray-600 normal-case font-normal tracking-normal">
          ({items.length})
        </span>
      </button>
      {open && (
        <div className="space-y-2">
          {items.map((item) => (
            <AlertItem key={`${item.employee_id}-${item.role_id}`} item={item} onCertify={onCertify} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExpiryAlertFeed({ items }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null)

  const critical = items.filter((i) => i.expiry_window === '7d')
  const warning  = items.filter((i) => i.expiry_window === '30d')
  const upcoming = items.filter((i) => i.expiry_window === '60d')

  if (items.length === 0) return null

  function handleCertify(item: ExpiryRiskRow) {
    setModal({
      employeeId: item.employee_id,
      employeeName: item.employee_name ?? item.employee_email,
      roleId: item.role_id,
      roleName: item.role_name,
    })
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <Clock className="w-4 h-4 text-orange-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Expiring certifications</h2>
        </div>
        <div className="p-6 space-y-5">
          <Group
            title="Action required"
            items={critical}
            defaultOpen
            onCertify={handleCertify}
            accent="red"
          />
          <Group
            title="This month"
            items={warning}
            defaultOpen
            onCertify={handleCertify}
            accent="orange"
          />
          <Group
            title="Upcoming (60 days)"
            items={upcoming}
            defaultOpen={false}
            onCertify={handleCertify}
            accent="gray"
          />
        </div>
      </div>

      {modal && (
        <CertifyModal
          employeeId={modal.employeeId}
          employeeName={modal.employeeName}
          roleId={modal.roleId}
          roleName={modal.roleName}
          mode="certify"
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
