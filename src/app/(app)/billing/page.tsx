import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Check } from 'lucide-react'
import BillingButtons from '@/components/billing/BillingButtons'
import Badge from '@/components/ui/Badge'
import { PLANS } from '@/lib/stripe'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') redirect('/dashboard')

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single()

  const isActive = ['trialing', 'active'].includes(company?.subscription_status ?? '')
  const currentPlan = company?.subscription_plan

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your subscription</p>
      </div>

      {/* Current plan status */}
      {isActive && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-900">
              {currentPlan === 'starter' ? 'Starter' : 'Pro'} plan
              {company?.subscription_status === 'trialing' && (
                <span className="ml-2 text-sm font-normal text-green-700">(trial active)</span>
              )}
            </p>
            <p className="text-sm text-green-700 mt-0.5">Your subscription is active</p>
          </div>
          <BillingButtons hasSubscription={true} />
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrentPlan = currentPlan === key && isActive

          return (
            <div
              key={key}
              className={`bg-white border-2 rounded-2xl p-6 ${
                isCurrentPlan ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    ${plan.price}
                    <span className="text-base font-normal text-gray-500">/mo</span>
                  </p>
                </div>
                {isCurrentPlan && <Badge variant="blue">Current plan</Badge>}
              </div>

              <ul className="space-y-2.5 mb-6">
                <PlanFeature>
                  {(plan.employeeLimit as number) === -1 ? 'Unlimited' : `Up to ${plan.employeeLimit}`} employees
                </PlanFeature>
                <PlanFeature>
                  {(plan.sopLimit as number) === -1 ? 'Unlimited SOPs' : `Up to ${plan.sopLimit} SOPs`}
                </PlanFeature>
                <PlanFeature>Step-by-step onboarding checklists</PlanFeature>
                <PlanFeature>Completion tracking</PlanFeature>
                <PlanFeature>Mobile-friendly employee view</PlanFeature>
                {key === 'pro' && <PlanFeature>Priority support</PlanFeature>}
              </ul>

              {!isCurrentPlan && !isActive && (
                <BillingButtons hasSubscription={false} plan={key as 'starter' | 'pro'} />
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        14-day free trial. Cancel anytime. No setup fees.
      </p>
    </div>
  )
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm text-gray-700">
      <Check className="w-4 h-4 text-green-500 shrink-0" />
      {children}
    </li>
  )
}
