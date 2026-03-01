'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, GripVertical, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import type { SOPBundle } from '@/types'

interface AvailableSOP {
  id: string
  title: string
  description: string | null
}

interface BundleEditorProps {
  companyId: string
  userId: string
  availableSOPs: AvailableSOP[]
  initialBundle?: SOPBundle & {
    bundle_sops?: { sop_id: string; position: number }[] | null
  }
}

const INPUT_CLS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'

export default function BundleEditor({
  companyId,
  userId,
  availableSOPs,
  initialBundle,
}: BundleEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialBundle?.name ?? '')
  const [description, setDescription] = useState(
    initialBundle?.description ?? ''
  )

  // ✅ Normalize bundle_sops safely
  const normalizedBundleSops =
    initialBundle?.bundle_sops ?? []

  // Ordered list of selected SOP IDs
  const [selectedIds, setSelectedIds] = useState<string[]>(
    [...normalizedBundleSops]
      .sort((a, b) => a.position - b.position)
      .map((bs) => bs.sop_id)
  )

  const selectedSOPs = selectedIds
    .map((id) => availableSOPs.find((s) => s.id === id))
    .filter(Boolean) as AvailableSOP[]

  const unselectedSOPs = availableSOPs.filter(
    (s) => !selectedIds.includes(s.id)
  )

  function addSOP(id: string) {
    setSelectedIds((prev) => [...prev, id])
  }

  function removeSOP(id: string) {
    setSelectedIds((prev) =>
      prev.filter((sid) => sid !== id)
    )
  }

  function moveUp(index: number) {
    if (index === 0) return
    setSelectedIds((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [
        next[index],
        next[index - 1],
      ]
      return next
    })
  }

  function moveDown(index: number) {
    if (index === selectedIds.length - 1) return
    setSelectedIds((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [
        next[index + 1],
        next[index],
      ]
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Bundle name is required')
      return
    }

    if (selectedIds.length === 0) {
      setError('Add at least one SOP to the bundle')
      return
    }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      let bundleId = initialBundle?.id

      const bundlePayload = {
        name: name.trim(),
        description: description.trim() || null,
      }

      if (bundleId) {
        const { error: bundleErr } = await supabase
          .from('sop_bundles')
          .update(bundlePayload)
          .eq('id', bundleId)

        if (bundleErr) throw bundleErr

        await supabase
          .from('bundle_sops')
          .delete()
          .eq('bundle_id', bundleId)
      } else {
        const { data: bundle, error: bundleErr } =
          await supabase
            .from('sop_bundles')
            .insert({
              company_id: companyId,
              created_by: userId,
              ...bundlePayload,
            })
            .select()
            .single()

        if (bundleErr || !bundle)
          throw (
            bundleErr ??
            new Error('Failed to create bundle')
          )

        bundleId = (bundle as unknown as SOPBundle).id
      }

      const bundleSopsToInsert = selectedIds.map(
        (sop_id, i) => ({
          bundle_id: bundleId!,
          sop_id,
          position: i + 1,
        })
      )

      const { error: sopErr } = await supabase
        .from('bundle_sops')
        .insert(bundleSopsToInsert)

      if (sopErr) throw sopErr

      router.push('/bundles')
      router.refresh()
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save bundle'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
  <div className="space-y-6 max-w-3xl">
    <Link
      href="/bundles"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to Bundles
    </Link>

    {/* Header */}
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        {initialBundle ? 'Edit Bundle' : 'Create New Bundle'}
      </h1>
    </div>

    {/* Error */}
    {error && (
      <div className="text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    )}

    {/* Name */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Bundle Name
      </label>
      <input
        className={INPUT_CLS}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. New Hire Onboarding"
      />
    </div>

    {/* Description */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Description (optional)
      </label>
      <textarea
        className={INPUT_CLS}
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description of this bundle"
      />
    </div>

    {/* Selected SOPs */}
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        Selected SOPs
      </h2>

      {selectedSOPs.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No SOPs selected yet.
        </p>
      )}

      <div className="space-y-2">
        {selectedSOPs.map((sop, index) => (
          <div
            key={sop.id}
            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-900 dark:text-white">
                {sop.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => moveUp(index)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ↑
              </button>
              <button
                onClick={() => moveDown(index)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ↓
              </button>
              <button
                onClick={() => removeSOP(sop.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Available SOPs */}
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        Available SOPs
      </h2>

      <div className="space-y-2">
        {unselectedSOPs.map((sop) => (
          <div
            key={sop.id}
            className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {sop.title}
              </p>
              {sop.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {sop.description}
                </p>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={() => addSOP(sop.id)}
            >
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>

    {/* Save */}
    <div className="pt-4">
      <Button
        onClick={handleSave}
        disabled={saving}
      >
        <Save className="w-4 h-4" />
        {saving ? 'Saving...' : 'Save Bundle'}
      </Button>
    </div>
  </div>
)
}