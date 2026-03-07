'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, TestTube, CheckCircle2, XCircle, ToggleLeft, ToggleRight, Copy, Check } from 'lucide-react'

const ALL_EVENTS = [
  { id: 'cert.created',         label: 'Certification created' },
  { id: 'cert.revoked',         label: 'Certification revoked' },
  { id: 'cert.expired',         label: 'Certification expired' },
  { id: 'role.below_threshold', label: 'Role below minimum threshold' },
  { id: 'health.at_risk',       label: 'Company health at risk' },
]

interface Endpoint {
  id: string
  url: string
  label: string | null
  events: string[]
  is_active: boolean
  last_fired_at: string | null
  last_status_code: number | null
  created_at: string
  secret?: string    // only present on creation
}

interface WebhookEndpointListProps {
  initialEndpoints: Endpoint[]
}

export default function WebhookEndpointList({ initialEndpoints }: WebhookEndpointListProps) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints)
  const [showForm, setShowForm]   = useState(false)
  const [newUrl,   setNewUrl]     = useState('')
  const [newLabel, setNewLabel]   = useState('')
  const [newEvents, setNewEvents] = useState<string[]>(ALL_EVENTS.map(e => e.id))
  const [creating, setCreating]   = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; code: number | null }>>({})
  const [message, setMessage]     = useState<{ type: 'success'|'error'; text: string } | null>(null)

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const handleCreate = useCallback(async () => {
    if (!newUrl) { setMessage({ type: 'error', text: 'URL is required.' }); return }
    setCreating(true)
    setMessage(null)
    setNewSecret(null)
    try {
      const res = await fetch('/api/integrations/zapier/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, label: newLabel || undefined, events: newEvents }),
      })
      const json = await res.json()
      if (json.error) { setMessage({ type: 'error', text: json.error }); return }
      setEndpoints(prev => [json.endpoint, ...prev])
      setNewSecret(json.endpoint.secret)
      setShowForm(false)
      setNewUrl('')
      setNewLabel('')
      setNewEvents(ALL_EVENTS.map(e => e.id))
    } catch {
      setMessage({ type: 'error', text: 'Failed to create endpoint.' })
    } finally {
      setCreating(false)
    }
  }, [newUrl, newLabel, newEvents])

  const handleToggleActive = useCallback(async (ep: Endpoint) => {
    const newActive = !ep.is_active
    setEndpoints(prev => prev.map(e => e.id === ep.id ? { ...e, is_active: newActive } : e))
    await fetch(`/api/integrations/zapier/endpoints/${ep.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newActive }),
    })
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this webhook endpoint?')) return
    setEndpoints(prev => prev.filter(e => e.id !== id))
    await fetch(`/api/integrations/zapier/endpoints/${id}`, { method: 'DELETE' })
  }, [])

  const handleTest = useCallback(async (id: string) => {
    setTestingId(id)
    try {
      const res = await fetch('/api/integrations/zapier/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpointId: id }),
      })
      const json = await res.json()
      setTestResult(prev => ({ ...prev, [id]: { ok: json.success, code: json.status_code } }))
    } catch {
      setTestResult(prev => ({ ...prev, [id]: { ok: false, code: null } }))
    } finally {
      setTestingId(null)
    }
  }, [])

  const copySecret = useCallback(() => {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    }
  }, [newSecret])

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

      {/* New secret reveal */}
      {newSecret && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⚠️ Copy your signing secret now — it won't be shown again</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 font-mono text-amber-900 dark:text-amber-200 break-all">
              {newSecret}
            </code>
            <button onClick={copySecret} className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors">
              {copiedSecret ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setNewSecret(null)} className="text-xs text-amber-600 dark:text-amber-400 underline">
            I've copied it — dismiss
          </button>
        </div>
      )}

      {/* Add endpoint button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add endpoint
        </button>
      )}

      {/* New endpoint form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">New webhook endpoint</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint URL</label>
            <input type="url" className={inputClass} placeholder="https://hooks.zapier.com/..." value={newUrl} onChange={e => setNewUrl(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label (optional)</label>
            <input type="text" className={inputClass} placeholder="e.g. Zapier — Slack alert" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events to subscribe</label>
            <div className="space-y-2">
              {ALL_EVENTS.map(ev => (
                <label key={ev.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvents.includes(ev.id)}
                    onChange={e => {
                      if (e.target.checked) setNewEvents(prev => [...prev, ev.id])
                      else setNewEvents(prev => prev.filter(x => x !== ev.id))
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{ev.label}</span>
                  <code className="text-xs text-gray-400 dark:text-gray-500">{ev.id}</code>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={creating} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors">
              {creating ? 'Creating…' : 'Create endpoint'}
            </button>
            <button onClick={() => { setShowForm(false); setNewUrl(''); setNewLabel('') }} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Endpoint list */}
      {endpoints.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          No endpoints yet. Add one to start receiving webhook events.
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map(ep => {
            const result = testResult[ep.id]
            return (
              <div key={ep.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {ep.label && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{ep.label}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ep.is_active
                          ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {ep.is_active ? 'Active' : 'Paused'}
                      </span>
                      {ep.last_status_code !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          ep.last_status_code >= 200 && ep.last_status_code < 300
                            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                        }`}>
                          {ep.last_status_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">{ep.url}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Events: {ep.events.join(', ')}
                      {ep.last_fired_at && ` · Last fired ${new Date(ep.last_fired_at).toLocaleString()}`}
                    </p>
                    {result && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
                        {result.ok
                          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Test delivered (HTTP {result.code})</>
                          : <><XCircle     className="w-3.5 h-3.5" /> Test failed (HTTP {result.code ?? 'error'})</>
                        }
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTest(ep.id)}
                      disabled={testingId === ep.id}
                      title="Send test event"
                      className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors"
                    >
                      <TestTube className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(ep)}
                      title={ep.is_active ? 'Pause' : 'Activate'}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                    >
                      {ep.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(ep.id)}
                      title="Delete endpoint"
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
