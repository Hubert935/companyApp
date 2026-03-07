'use client'

import { useState } from 'react'
import { Link2, Send, Hash, CheckCircle2 } from 'lucide-react'

interface SlackSettingsFormProps {
  isConnected: boolean
  teamName: string | null
  channelId: string | null
}

export default function SlackSettingsForm({ isConnected, teamName, channelId }: SlackSettingsFormProps) {
  const [channel, setChannel] = useState(channelId ?? '')
  const [saving, setSaving]   = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success'|'error'; text: string } | null>(null)

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  async function handleSaveChannel() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/slack/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channel }),
      })
      const json = await res.json()
      if (json.error) setMessage({ type: 'error', text: json.error })
      else setMessage({ type: 'success', text: 'Channel saved!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save channel.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSendNow() {
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/slack/send-digest', { method: 'POST' })
      const json = await res.json()
      if (json.error) setMessage({ type: 'error', text: json.error })
      else setMessage({ type: 'success', text: 'Digest sent to your Slack channel!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to send digest.' })
    } finally {
      setSending(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Connect Slack</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Authorize the CompanyApp Slack bot to post messages to your workspace.
        </p>
        <a
          href="/api/integrations/slack/connect"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4A154B] hover:bg-[#3b1040] text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Connect to Slack
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Connected status */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          Connected to {teamName ?? 'your Slack workspace'}
        </div>

        {/* Channel selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Digest channel
          </label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1 flex-1">
              <Hash className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                className={inputClass}
                placeholder="general or C01234ABCDE"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              />
            </div>
            <button
              onClick={handleSaveChannel}
              disabled={saving || !channel}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Enter a channel name (general) or channel ID (starts with C). The bot must be invited to private channels.
          </p>
        </div>
      </div>

      {/* Send now */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Send digest now</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Preview the weekly digest by sending it immediately to your configured channel.
        </p>
        <button
          onClick={handleSendNow}
          disabled={sending || !channelId}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending…' : 'Send now'}
        </button>
        {!channelId && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Save a channel first to enable sending.</p>
        )}
      </div>

      {/* Schedule info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          🕒 <strong>Weekly schedule:</strong> The digest is automatically sent every Monday at 9am UTC when you configure a cron job at <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">/api/integrations/cron/slack-digest</code> with your <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">CRON_SECRET</code>.
        </p>
      </div>

      {/* Disconnect */}
      <div className="flex justify-end">
        <a
          href="/api/integrations/slack/connect"
          className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 underline"
        >
          Reconnect Slack workspace
        </a>
      </div>
    </div>
  )
}
