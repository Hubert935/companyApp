'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const inputClass =
  'w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    companyName: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, role: 'owner' } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Signup failed — no user returned')
      setLoading(false)
      return
    }

    // No session = email confirmation is still ON in Supabase
    if (!authData.session) {
      setError(
        'Email confirmation is enabled in Supabase. Go to Authentication → Settings and turn off "Enable email confirmations", then try again.'
      )
      setLoading(false)
      return
    }

    // Create company + link profile via server route (uses service role, bypasses RLS)
    const res = await fetch('/api/auth/complete-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName: form.companyName }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(`Setup failed: ${data.error ?? 'unknown error'}`)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create your workspace</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Set up SOPs and training for your team</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your name</label>
              <input type="text" required value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className={inputClass} placeholder="Jane Smith" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company name</label>
              <input type="text" required value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className={inputClass} placeholder="Acme Cleaning Co." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work email</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass} placeholder="jane@acmecleaning.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input type="password" required minLength={8} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass} placeholder="At least 8 characters" />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating workspace…' : 'Create workspace'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
