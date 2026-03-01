import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Pencil } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import type { SOP, SOPCategory } from '@/types'

type SOPWithDetails = SOP & {
  steps: { id: string }[]
  sop_categories: SOPCategory | null
}

interface PageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function SOPsPage({ searchParams }: PageProps) {
  const { category: selectedCategoryId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.company_id) redirect('/auth/login')

  const canEdit = profile.role === 'owner' || profile.role === 'manager'

  // Fetch categories for filter pills
  const { data: rawCategories } = await supabase
    .from('sop_categories')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('name')
  const categories = (rawCategories ?? []) as unknown as SOPCategory[]

  // Fetch SOPs with step count + joined category
  let sopQuery = supabase
    .from('sops')
    .select('*, steps:sop_steps(id), sop_categories(*)')
    .eq('company_id', profile.company_id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (selectedCategoryId) {
    sopQuery = sopQuery.eq('category_id', selectedCategoryId)
  }

  const { data: rawSops } = await sopQuery
  const sops = (rawSops ?? []) as unknown as SOPWithDetails[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SOPs</h1>
          <p className="text-sm text-gray-500 mt-1">Standard Operating Procedures for your team</p>
        </div>
        {canEdit && (
          <Link href="/sops/new">
            <Button>
              <Plus className="w-4 h-4" />
              New SOP
            </Button>
          </Link>
        )}
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/sops"
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedCategoryId
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/sops?category=${cat.id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategoryId === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {sops.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={selectedCategoryId ? 'No SOPs in this category' : 'No SOPs yet'}
          description={
            selectedCategoryId
              ? 'Try a different category or create a new SOP.'
              : 'Create your first SOP to start documenting your processes.'
          }
          action={
            canEdit ? (
              <Link href="/sops/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  {selectedCategoryId ? 'Create SOP' : 'Create first SOP'}
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sops.map((sop) => {
            const cat = sop.sop_categories
            return (
              <Link
                key={sop.id}
                href={`/sops/${sop.id}`}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {canEdit && (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-4 h-4 text-gray-400" />
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{sop.title}</h3>
                {sop.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{sop.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="blue">{sop.steps?.length ?? 0} steps</Badge>
                  {cat ? (
                    <Badge variant={cat.color as BadgeVariant}>{cat.name}</Badge>
                  ) : sop.category ? (
                    <Badge variant="gray">{sop.category}</Badge>
                  ) : null}
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDate(sop.updated_at)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
