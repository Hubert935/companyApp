'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, GripVertical, Trash2, Save, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import type { SOP, SOPStep } from '@/types'

interface SOPEditorProps {
  companyId: string
  userId: string
  initialSOP?: SOP & { steps: SOPStep[] }
}

interface StepDraft {
  id?: string
  title: string
  content: string
  image_url: string
  position: number
}

export default function SOPEditor({ companyId, userId, initialSOP }: SOPEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(initialSOP?.title ?? '')
  const [description, setDescription] = useState(initialSOP?.description ?? '')
  const [category, setCategory] = useState(initialSOP?.category ?? '')
  const [steps, setSteps] = useState<StepDraft[]>(
    initialSOP?.steps?.length
      ? initialSOP.steps.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content ?? '',
          image_url: s.image_url ?? '',
          position: s.position,
        }))
      : [{ title: '', content: '', image_url: '', position: 1 }]
  )

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { title: '', content: '', image_url: '', position: prev.length + 1 },
    ])
  }

  function removeStep(index: number) {
    if (steps.length === 1) return
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, position: i + 1 }))
    )
  }

  function updateStep(index: number, field: keyof StepDraft, value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    const newSteps = [...steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSteps.length) return
    ;[newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]
    setSteps(newSteps.map((s, i) => ({ ...s, position: i + 1 })))
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('SOP title is required')
      return
    }
    if (steps.some((s) => !s.title.trim())) {
      setError('All steps must have a title')
      return
    }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      let sopId = initialSOP?.id

      if (sopId) {
        // Update existing SOP
        const { error: sopError } = await supabase
          .from('sops')
          .update({ title: title.trim(), description: description.trim(), category: category.trim() })
          .eq('id', sopId)

        if (sopError) throw sopError

        // Delete all existing steps and re-insert (simple approach)
        await supabase.from('sop_steps').delete().eq('sop_id', sopId)
      } else {
        // Create new SOP
        const { data: sop, error: sopError } = await supabase
          .from('sops')
          .insert({
            company_id: companyId,
            title: title.trim(),
            description: description.trim() || null,
            category: category.trim() || null,
            created_by: userId,
          })
          .select()
          .single()

        if (sopError || !sop) throw sopError ?? new Error('Failed to create SOP')
        sopId = sop.id
      }

      // Insert steps
      const stepsToInsert = steps.map((s, i) => ({
        sop_id: sopId!,
        position: i + 1,
        title: s.title.trim(),
        content: s.content.trim() || null,
        image_url: s.image_url.trim() || null,
        video_url: null,
      }))

      const { error: stepsError } = await supabase
        .from('sop_steps')
        .insert(stepsToInsert)

      if (stepsError) throw stepsError

      router.push('/sops')
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save SOP'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/sops" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" />
        Back to SOPs
      </Link>

      {/* SOP metadata */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            placeholder="e.g. Closing Procedure, New Employee Onboarding"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
            placeholder="Brief summary of what this SOP covers"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            placeholder="e.g. Opening, Cleaning, Safety"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Steps</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 relative"
            >
              {/* Step header */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStep(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 disabled:opacity-20"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  placeholder={`Step ${index + 1} title`}
                />
                <button
                  onClick={() => removeStep(index)}
                  disabled={steps.length === 1}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Step content */}
              <textarea
                value={step.content}
                onChange={(e) => updateStep(index, 'content', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                placeholder="Describe exactly what to do in this step…"
              />

              {/* Image URL */}
              <input
                type="url"
                value={step.image_url}
                onChange={(e) => updateStep(index, 'image_url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                placeholder="Image URL (optional)"
              />
              {step.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={step.image_url}
                  alt={`Step ${index + 1} preview`}
                  className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              )}

              {/* Reorder buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => moveStep(index, 'up')}
                  disabled={index === 0}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                >
                  ↑ Move up
                </button>
                <button
                  onClick={() => moveStep(index, 'down')}
                  disabled={index === steps.length - 1}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                >
                  ↓ Move down
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addStep}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add step
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Link href="/sops">
          <Button variant="secondary">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : initialSOP ? 'Save changes' : 'Create SOP'}
        </Button>
      </div>
    </div>
  )
}
