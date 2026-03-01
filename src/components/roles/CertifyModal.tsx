'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, X, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'

interface CertifyModalProps {
  employeeId: string
  employeeName: string
  roleId: string
  roleName: string
  mode: 'certify' | 'revoke'
  onClose: () => void
}

export default function CertifyModal({
  employeeId,
  employeeName,
  roleId,
  roleName,
  mode,
  onClose,
}: CertifyModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState('')
  const [reason, setReason] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const endpoint = mode === 'certify' ? '/api/roles/certify' : '/api/roles/revoke'
    const body =
      mode === 'certify'
        ? { employeeId, roleId, expiresAt: expiresAt || null }
        : { employeeId, roleId, reason: reason || null }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      router.refresh()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const isCertify = mode === 'certify'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {isCertify ? (
              <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                {isCertify ? 'Certify Capability' : 'Revoke Certification'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {employeeName} — {roleName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {isCertify ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                You are confirming that <strong>{employeeName}</strong> has demonstrated operational
                capability for the <strong>{roleName}</strong> role. Your name will be recorded as
                the certifying authority.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Expiry date <span className="text-gray-400 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400">
                  Leave blank for no expiry. Set for certifications that require renewal (e.g. annual food safety).
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This will remove <strong>{employeeName}</strong>'s certified status for{' '}
                <strong>{roleName}</strong>. They will need to be re-certified by a manager before
                regaining capability status.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reason <span className="text-gray-400 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Process was updated, re-training required"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 pt-0">
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={isCertify ? '' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'}
          >
            {loading
              ? isCertify ? 'Certifying…' : 'Revoking…'
              : isCertify ? 'Certify' : 'Revoke Certification'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
