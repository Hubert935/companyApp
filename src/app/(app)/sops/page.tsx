import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Pencil } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import type { SOP } from '@/types'

type SOPWithStepCount = SOP & { steps: { id: string }[] }

export default async function SOPsPage() {
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

  const { data: rawSops } = await supabase
    .from('sops')
    .select('*, steps:sop_steps(id)')
    .eq('company_id', profile.company_id)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  const sops = (rawSops ?? []) as unknown as SOPWithStepCount[]

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

      {sops.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No SOPs yet"
          description="Create your first SOP to start documenting your processes."
          action={
            canEdit ? (
              <Link href="/sops/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Create first SOP
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sops.map((sop) => (
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
                {sop.category && <Badge variant="gray">{sop.category}</Badge>}
                <span className="text-xs text-gray-400 ml-auto">
                  {formatDate(sop.updated_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
