'use client'

import { useState } from 'react'
import { Save, Link2, Unlink, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface HomebaseSettingsFormProps {
  isConnected: boolean
  locationId: string
}

interface ConflictRow {
  employee_name: string
  role_name: string
  shift_date: string
  cert_status: string
}

export default function HomebaseSettingsForm({ isConnected, locationId }: HomebaseSettingsFormProps) {
  const [apiKey,  setApiKey]  = useState('')
  const [locId,   setLocId]   = useState(locationId)
  const [saving,  setSaving]  = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success'|'error'; text: string } | null>(null)
  const [conflicts, setConflicts] = useState<ConflictRow[] | null>(null)
  const [loadingConflicts, setLoadingConflicts] = useState(false)

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/homebase/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, location_id: locId }),
      })
      const json = await res.json()
      if (json.error) setMessage({ type: 'error', text: json.error })
      else setMessage({ type: 'success', text: 'Homebase connected successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to connect.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Homebase?')) return
    setDisconnecting(true)
    try {
      await fetch('/api/integrations/homebase/connect', { method: 'DELETE' })
      setMessage({ type: 'success', text: 'Homebase disconnected.' })
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleViewConflicts() {
    setLoadingConflicts(true)
    setConflicts(null)
    try {
      const res = await fetch('/api/integrations/homebase/schedule')
      const json = await res.json()
      if (json.error) setMessage({ type: 'error', text: json.error })
      else setConflicts(json.conflicts)
    } catch {
      setMessage({ type: 'error', text: 'Failed to load schedule.' })
    } finally {
      setLoadingConflicts(false)
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Connection settings</h2>

        {!isConnected && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
              <input type="password" className={inputClass} placeholder="hb_live_…" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location ID</label>
              <input type="text" className={inputClass} placeholder="123456" value={locId} onChange={e => setLocId(e.target.value)} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Find this in Homebase Settings → Locations.</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !apiKey || !locId}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Link2 className="w-4 h-4" />
              {saving ? 'Connecting…' : 'Connect Homebase'}
            </button>
          </>
        )}

        {isConnected && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              Connected — Location {locationId || locId}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleViewConflicts}
                disabled={loadingConflicts}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Save className="w-4 h-4" />
                {loadingConflicts ? 'Loading…' : 'View schedule conflicts'}
              </button>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl transition-colors border border-red-200 dark:border-red-800"
              >
                <Unlink className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {conflicts !== null && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            This Week&apos;s Conflicts
            <span className={`ml-2 text-sm font-normal ${conflicts.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
              ({conflicts.length} found)
            </span>
          </h2>

          {conflicts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              No conflicts — all scheduled employees are certified!
            </div>
          ) : (
            conflicts.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{c.employee_name}</span>
                  <span className="text-gray-400 dark:text-gray-500"> · {c.role_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">{c.shift_date}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {c.cert_status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
