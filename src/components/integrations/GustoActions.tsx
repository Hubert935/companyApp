'use client'

import { useState } from 'react'
import { RefreshCw, Link2, Unlink } from 'lucide-react'

interface GustoActionsProps {
  isConnected: boolean
}

export default function GustoActions({ isConnected }: GustoActionsProps) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced?: number; updated?: number; newInRoster?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setSyncResult(null)
    try {
      const res = await fetch('/api/integrations/gusto/sync', { method: 'POST' })
      const json = await res.json()
      if (json.error) setError(json.error)
      else setSyncResult(json)
    } catch {
      setError('Failed to sync.')
    } finally {
      setSyncing(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex">
        <a
          href="/api/integrations/gusto/connect"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Connect Gusto
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {syncResult && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
          Sync complete — {syncResult.synced} employees reviewed, {syncResult.updated} profiles updated.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>

        <a
          href="/api/integrations/gusto/connect"
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
        >
          <Unlink className="w-4 h-4" />
          Reconnect
        </a>
      </div>
    </div>
  )
}
