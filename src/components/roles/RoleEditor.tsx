'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import type { CompanyRole, RoleSOP, SOP, CategoryColor } from '@/types'

interface AvailableSOP {
  id: string
  title: string
  description: string | null
}

interface RoleEditorProps {
  companyId: string
  userId: string
  availableSOPs: AvailableSOP[]
  initialRole?: CompanyRole & { role_sops: RoleSOP[] }
}

const COLOR_OPTIONS: { value: CategoryColor; label: string; cls: string }[] = [
  { value: 'blue',   label: 'Blue',   cls: 'bg-blue-500' },
  { value: 'green',  label: 'Green',  cls: 'bg-green-500' },
  { value: 'orange', label: 'Orange', cls: 'bg-orange-500' },
  { value: 'purple', label: 'Purple', cls: 'bg-purple-500' },
  { value: 'red',    label: 'Red',    cls: 'bg-red-500' },
  { value: 'gray',   label: 'Gray',   cls: 'bg-gray-400' },
]

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

export default function RoleEditor({ companyId, userId, availableSOPs, initialRole }: RoleEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialRole?.name ?? '')
  const [description, setDescription] = useState(initialRole?.description ?? '')
  const [color, setColor] = useState<CategoryColor>(initialRole?.color ?? 'blue')

  // Selected SOP ids in order
  const initialSelected = (initialRole?.role_sops ?? [])
    .sort((a, b) => a.position - b.position)
    .map((rs) => rs.sop_id)
  const [selectedSopIds, setSelectedSopIds] = useState<string[]>(initialSelected)

  function toggleSOP(sopId: string) {
    setSelectedSopIds((prev) =>
      prev.includes(sopId) ? prev.filter((id) => id !== sopId) : [...prev, sopId]
    )
  }

  function moveUp(index: number) {
    if (index === 0) return
    setSelectedSopIds((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    setSelectedSopIds((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) { setError('Role name is required'); return }
    setSaving(true)
    setError(null)

    const supabase = createClient()

    try {
      let roleId = initialRole?.id

      if (roleId) {
        // Update existing role
        const { error: updateErr } = await supabase
          .from('company_roles')
          .update({ name: name.trim(), description: description.trim() || null, color })
          .eq('id', roleId)
        if (updateErr) throw updateErr
      } else {
        // Insert new role
        const { data, error: insertErr } = await supabase
          .from('company_roles')
          .insert({ company_id: companyId, name: name.trim(), description: description.trim() || null, color })
          .select('id')
          .single()
        if (insertErr || !data) throw insertErr ?? new Error('Failed to create role')
        roleId = data.id
      }

      // Replace role_sops — delete then insert
      await supabase.from('role_sops').delete().eq('role_id', roleId)

      if (selectedSopIds.length > 0) {
        const rows = selectedSopIds.map((sop_id, i) => ({
          role_id: roleId as string,
          sop_id,
          position: i + 1,
        }))
        const { error: sopErr } = await supabase.from('role_sops').insert(rows)
        if (sopErr) throw sopErr
      }

      router.push('/roles')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save role')
    } finally {
      setSaving(false)
    }
  }

  // Split SOPs into selected (ordered) and unselected
  const selectedSOPs = selectedSopIds
    .map((id) => availableSOPs.find((s) => s.id === id))
    .filter(Boolean) as AvailableSOP[]

  const unselectedSOPs = availableSOPs.filter((s) => !selectedSopIds.includes(s.id))

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back */}
      <Link href="/roles" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" /> Back to Roles
      </Link>

      {/* Name */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Role Details</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Barista, Shift Manager, Line Cook"
            className={INPUT_CLS}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What responsibilities does this role carry?"
            rows={2}
            className={`${INPUT_CLS} resize-none`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Colour</label>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                className={`w-7 h-7 rounded-full transition-all ${opt.cls} ${
                  color === opt.value
                    ? 'ring-2 ring-offset-2 ring-gray-500 dark:ring-offset-gray-800 scale-110'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title={opt.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Required SOPs */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Required SOPs</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Employees must complete all of these to be eligible for certification.
          </p>
        </div>

        {/* Selected SOPs (ordered) */}
        {selectedSOPs.length > 0 && (
          <div className="space-y-2">
            {selectedSOPs.map((sop, i) => (
              <div
                key={sop.id}
                className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
              >
                <span className="text-xs font-bold text-blue-400 w-5 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{sop.title}</p>
                  {sop.description && (
                    <p className="text-xs text-gray-400 truncate">{sop.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === selectedSOPs.length - 1}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >↓</button>
                  <button
                    type="button"
                    onClick={() => toggleSOP(sop.id)}
                    className="p-1 rounded text-red-400 hover:text-red-600 ml-1"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Unselected SOPs */}
        {unselectedSOPs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium">Add SOPs:</p>
            {unselectedSOPs.map((sop) => (
              <button
                key={sop.id}
                type="button"
                onClick={() => toggleSOP(sop.id)}
                className="w-full flex items-center gap-3 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors text-left"
              >
                <span className="text-gray-300 text-lg leading-none">+</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{sop.title}</p>
                  {sop.description && (
                    <p className="text-xs text-gray-400 truncate">{sop.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {availableSOPs.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No SOPs yet. <Link href="/sops/new" className="text-blue-500 hover:underline">Create one first.</Link>
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : initialRole ? 'Save Changes' : 'Create Role'}
        </Button>
        <Link href="/roles">
          <Button variant="secondary">Cancel</Button>
        </Link>
      </div>
    </div>
  )
}
