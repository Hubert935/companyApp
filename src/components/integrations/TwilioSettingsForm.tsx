'use client'

import { useState } from 'react'
import { MessageSquare, Phone, Save, TestTube } from 'lucide-react'

interface Settings {
  twilio_account_sid: string | null
  twilio_auth_token: string | null
  twilio_from_number: string | null
  notify_expiry_7d: boolean
  notify_expired: boolean
  notify_pending_48h: boolean
}

interface TwilioSettingsFormProps {
  initialSettings: Settings | null
}

export default function TwilioSettingsForm({ initialSettings }: TwilioSettingsFormProps) {
  const [accountSid, setAccountSid] = useState(initialSettings?.twilio_account_sid ?? '')
  const [authToken, setAuthToken]   = useState(initialSettings?.twilio_auth_token ?? '')
  const [fromNumber, setFromNumber] = useState(initialSettings?.twilio_from_number ?? '')
  const [notifyExpiry7d,  setNotifyExpiry7d]  = useState(initialSettings?.notify_expiry_7d ?? true)
  const [notifyExpired,   setNotifyExpired]   = useState(initialSettings?.notify_expired ?? true)
  const [notifyPending48h, setNotifyPending48h] = useState(initialSettings?.notify_pending_48h ?? true)

  const [saving,  setSaving]  = useState(false)
  const [testing, setTesting] = useState(false)
  const [testTo,  setTestTo]  = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/twilio/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twilio_account_sid: accountSid,
          twilio_auth_token: authToken,
          twilio_from_number: fromNumber,
          notify_expiry_7d: notifyExpiry7d,
          notify_expired: notifyExpired,
          notify_pending_48h: notifyPending48h,
        }),
      })
      const json = await res.json()
      if (json.error) setMessage({ type: 'error', text: json.error })
      else setMessage({ type: 'success', text: 'Settings saved successfully.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!testTo) { setMessage({ type: 'error', text: 'Enter a phone number to test.' }); return }
    setTesting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/twilio/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo }),
      })
      const json = await res.json()
      if (json.error) setMessage({ type: 'error', text: json.error })
      else setMessage({ type: 'success', text: `Test SMS sent to ${testTo}!` })
    } catch {
      setMessage({ type: 'error', text: 'Failed to send test SMS.' })
    } finally {
      setTesting(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

  return (
    <div className="space-y-8">
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Credentials */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Twilio Credentials</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Find these in your{' '}
          <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Twilio Console
          </a>.
        </p>

        <div>
          <label className={labelClass}>Account SID</label>
          <input
            type="text"
            className={inputClass}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Auth Token</label>
          <input
            type="password"
            className={inputClass}
            placeholder="••••••••••••••••••••••••••••••••"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>From Number</label>
          <input
            type="text"
            className={inputClass}
            placeholder="+15551234567"
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Must be a Twilio phone number in E.164 format.</p>
        </div>
      </section>

      {/* Notification toggles */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Notification Triggers</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Choose which events trigger an automatic SMS. The daily cron job checks these rules.
        </p>

        {[
          { label: 'Expiring in 7 days', desc: 'Notify employees whose certifications expire within 7 days.', checked: notifyExpiry7d, onChange: setNotifyExpiry7d },
          { label: 'Expired certifications', desc: 'Notify employees whose certifications have already expired.', checked: notifyExpired, onChange: setNotifyExpired },
          { label: 'Pending review > 48h', desc: 'Notify managers when an employee has been in "pending review" for over 48 hours.', checked: notifyPending48h, onChange: setNotifyPending48h },
        ].map(({ label, desc, checked, onChange }) => (
          <label key={label} className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                checked
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
              }`}>
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
          </label>
        ))}
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      {/* Test section */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <TestTube className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Send Test SMS</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Save your credentials above first, then send a test message to verify everything is working.
        </p>

        <div className="flex gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="tel"
              className={inputClass}
              placeholder="+15559876543"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
          >
            {testing ? 'Sending…' : 'Send test'}
          </button>
        </div>
      </section>
    </div>
  )
}
