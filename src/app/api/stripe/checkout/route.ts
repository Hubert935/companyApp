import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLANS, type PlanKey } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await request.json() as { plan: PlanKey }

    if (!PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 400 })
    }

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = company.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          company_id: company.id,
          user_id: user.id,
        },
      })
      customerId = customer.id

      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLANS[plan].priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/billing`,
      metadata: {
        company_id: company.id,
        plan,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          company_id: company.id,
          plan,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
