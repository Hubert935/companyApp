import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import BundleList from '@/components/bundles/BundleList'

export default async function BundlesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  if (!profile.company_id) redirect('/auth/login')

  const [bundlesResult, employeesResult, categoriesResult] = await Promise.all([
    supabase
      .from('sop_bundles')
      .select('*, bundle_sops(sop_id, sops(category_id, sop_categories(id, name, color)))')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false }),

    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('company_id', profile.company_id)
      .neq('id', user.id)
      .order('full_name'),

    supabase
      .from('sop_categories')
      .select('id, name, color')
      .eq('company_id', profile.company_id)
      .order('name'),
  ])

  type SOPCategory = { id: string; name: string; color: string }

  type BundleWithCategories = {
    id: string
    name: string
    description: string | null
    bundle_sops: {
      sop_id: string
      sops: {
        category_id: string | null
        sop_categories: SOPCategory | null
      } | null
    }[] | null
  }

  const bundles = (bundlesResult.data ?? []) as unknown as BundleWithCategories[]
  const employees = (employeesResult.data ?? []) as { id: string; full_name: string | null; email: string }[]
  const categories = (categoriesResult.data ?? []) as SOPCategory[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bundles</h1>
          <p className="text-sm text-gray-500 mt-1">Group SOPs for bulk assignment</p>
        </div>
        <Link href="/bundles/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Bundle
          </Button>
        </Link>
      </div>

      {bundles.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No bundles yet"
          description="Create a bundle to group SOPs and assign them all at once — great for new hire onboarding."
          action={
            <Link href="/bundles/new">
              <Button>
                <Plus className="w-4 h-4" />
                Create first bundle
              </Button>
            </Link>
          }
        />
      ) : (
        <BundleList
          bundles={bundles}
          employees={employees}
          categories={categories}
          currentUserId={user.id}
          canEdit
        />
      )}
    </div>
  )
}
