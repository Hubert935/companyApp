'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { CreditCard, ExternalLink } from 'lucide-react'

interface BillingButtonsProps {
  hasSubscription: boolean
  plan?: 'starter' | 'pro'
}

export default function BillingButtons({ hasSubscription, plan }: BillingButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    if (!plan) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })

    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
    }
  }

  if (hasSubscription) {
    return (
      <div>
        <Button variant="secondary" onClick={handlePortal} disabled={loading}>
          <CreditCard className="w-4 h-4" />
          {loading ? 'Loading…' : 'Manage billing'}
        </Button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <Button onClick={handleCheckout} disabled={loading} className="w-full">
        <ExternalLink className="w-4 h-4" />
        {loading ? 'Loading…' : 'Start 14-day trial'}
      </Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
