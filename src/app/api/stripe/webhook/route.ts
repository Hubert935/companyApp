import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

// Use service role for webhook (no user session)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  const supabase = getServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const companyId = session.metadata?.company_id
      const plan = session.metadata?.plan

      if (companyId && session.subscription) {
        await supabase
          .from('companies')
          .update({
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'trialing',
            subscription_plan: plan,
          })
          .eq('id', companyId)
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription
      const companyId = sub.metadata?.company_id

      if (companyId) {
        await supabase
          .from('companies')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status as string,
            subscription_plan: sub.metadata?.plan,
          })
          .eq('id', companyId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const companyId = sub.metadata?.company_id

      if (companyId) {
        await supabase
          .from('companies')
          .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            subscription_plan: null,
          })
          .eq('id', companyId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      // `subscription` is string | Stripe.Subscription | null in Stripe v20
      const sub = invoice.subscription
      const subscriptionId = typeof sub === 'string' ? sub : sub?.id ?? null
      if (subscriptionId) {
        await supabase
          .from('companies')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
