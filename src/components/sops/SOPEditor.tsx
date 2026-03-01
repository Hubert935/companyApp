'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, GripVertical, Trash2, Save, ArrowLeft, Video, CheckSquare, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import type { SOP, SOPStep, SOPCategory, StepType, CategoryColor } from '@/types'

// ─── colour map for category badges ──────────────────────────────────────────
const COLOR_CLASSES: Record<CategoryColor, string> = {
  blue:   'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300',
  green:  'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  red:    'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300',
  gray:   'bg-gray-100   dark:bg-gray-800      text-gray-600   dark:text-gray-300',
}

const STEP_TYPE_LABELS: Record<StepType, { label: string; icon: React.ReactNode }> = {
  instruction:    { label: 'Instruction',    icon: <FileText   className="w-3.5 h-3.5" /> },
  video:          { label: 'Video',          icon: <Video      className="w-3.5 h-3.5" /> },
  acknowledgement:{ label: 'Acknowledgement',icon: <CheckSquare className="w-3.5 h-3.5" /> },
}

interface SOPEditorProps {
  companyId: string
  userId: string
  initialSOP?: SOP & { steps: SOPStep[] }
  categories: SOPCategory[]
}

interface StepDraft {
  id?: string
  step_type: StepType
  title: string
  content: string
  image_url: string
  video_url: string
  position: number
}

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400'

export default function SOPEditor({ companyId, userId, initialSOP, categories }: SOPEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle]           = useState(initialSOP?.title ?? '')
  const [description, setDescription] = useState(initialSOP?.description ?? '')
  const [categoryId, setCategoryId] = useState<string>(initialSOP?.category_id ?? '')

  // Inline "new category" UI
  const [showNewCat, setShowNewCat]   = useState(false)
  const [newCatName, setNewCatName]   = useState('')
  const [newCatColor, setNewCatColor] = useState<CategoryColor>('blue')
  const [savingCat, setSavingCat]     = useState(false)

  const [steps, setSteps] = useState<StepDraft[]>(
    initialSOP?.steps?.length
      ? initialSOP.steps.map((s) => ({
          id:        s.id,
          step_type: s.step_type,
          title:     s.title,
          content:   s.content    ?? '',
          image_url: s.image_url  ?? '',
          video_url: s.video_url  ?? '',
          position:  s.position,
        }))
      : [{ step_type: 'instruction', title: '', content: '', image_url: '', video_url: '', position: 1 }]
  )

  // Track categories in local state so newly created ones appear immediately
  const [localCategories, setLocalCategories] = useState<SOPCategory[]>(categories)

  // ── Category helpers ────────────────────────────────────────────────────────
  async function handleCreateCategory() {
    if (!newCatName.trim()) return
    setSavingCat(true)
    const supabase = createClient()
    const { data, error: catError } = await supabase
      .from('sop_categories')
      .insert({ company_id: companyId, name: newCatName.trim(), color: newCatColor })
      .select()
      .single()
    setSavingCat(false)
    if (catError || !data) { setError(catError?.message ?? 'Failed to create category'); return }
    const newCat = data as unknown as SOPCategory
    setLocalCategories((prev) => [...prev, newCat])
    setCategoryId(newCat.id)
    setNewCatName('')
    setShowNewCat(false)
  }

  // ── Step helpers ────────────────────────────────────────────────────────────
  function addStep() {
    setSteps((prev) => [
      ...prev,
      { step_type: 'instruction', title: '', content: '', image_url: '', video_url: '', position: prev.length + 1 },
    ])
  }

  function removeStep(index: number) {
    if (steps.length === 1) return
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i + 1 })))
  }

  function updateStep<K extends keyof StepDraft>(index: number, field: K, value: StepDraft[K]) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function moveStep(index: number, direction: 'up' | 'down') {
    const newSteps = [...steps]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newSteps.length) return
    ;[newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]]
    setSteps(newSteps.map((s, i) => ({ ...s, position: i + 1 })))
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) { setError('SOP title is required'); return }
    if (steps.some((s) => !s.title.trim())) { setError('All steps must have a title'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    try {
      let sopId = initialSOP?.id

      const sopPayload = {
        title:       title.trim(),
        description: description.trim() || null,
        category_id: categoryId || null,
      }

      if (sopId) {
        const { error: sopError } = await supabase.from('sops').update(sopPayload).eq('id', sopId)
        if (sopError) throw sopError
        await supabase.from('sop_steps').delete().eq('sop_id', sopId)
      } else {
        const { data: sop, error: sopError } = await supabase
          .from('sops')
          .insert({ company_id: companyId, created_by: userId, ...sopPayload })
          .select()
          .single()
        if (sopError || !sop) throw sopError ?? new Error('Failed to create SOP')
        sopId = (sop as unknown as SOP).id
      }

      const stepsToInsert = steps.map((s, i) => ({
        sop_id:    sopId!,
        position:  i + 1,
        step_type: s.step_type,
        title:     s.title.trim(),
        content:   s.content.trim()   || null,
        image_url: s.step_type === 'instruction'    ? (s.image_url.trim()  || null) : null,
        video_url: s.step_type === 'video'          ? (s.video_url.trim()  || null) : null,
      }))

      const { error: stepsError } = await supabase.from('sop_steps').insert(stepsToInsert)
      if (stepsError) throw stepsError

      router.push('/sops')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save SOP')
    } finally {
      setSaving(false)
    }
  }

  const selectedCategory = localCategories.find((c) => c.id === categoryId)

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/sops" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="w-4 h-4" />
        Back to SOPs
      </Link>

      {/* ── SOP metadata ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Details</h2>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT_CLS.replace('px-3 py-2', 'px-4 py-3')}
            placeholder="e.g. Closing Procedure, New Employee Onboarding"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={`${INPUT_CLS.replace('px-3 py-2', 'px-4 py-3')} resize-none`}
            placeholder="Brief summary of what this SOP covers"
          />
        </div>

        {/* Category — dropdown + inline creation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </label>

          <div className="flex items-center gap-2">
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setShowNewCat(false) }}
              className={`${INPUT_CLS.replace('px-3 py-2', 'px-3 py-2.5')} flex-1`}
            >
              <option value="">— None —</option>
              {localCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {selectedCategory && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${COLOR_CLASSES[selectedCategory.color]}`}>
                {selectedCategory.name}
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowNewCat((v) => !v)}
              className="shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showNewCat ? 'Cancel' : '+ New'}
            </button>
          </div>

          {/* Inline new-category form */}
          {showNewCat && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name"
                className={`${INPUT_CLS} flex-1`}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory() } }}
              />
              <select
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value as CategoryColor)}
                className={`${INPUT_CLS} w-28`}
              >
                {(Object.keys(COLOR_CLASSES) as CategoryColor[]).map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <Button onClick={handleCreateCategory} disabled={savingCat || !newCatName.trim()}>
                {savingCat ? '…' : 'Add'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Steps ────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Steps</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {steps.length} step{steps.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">

              {/* Header row: drag handle · number · title · delete */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveStep(index, 'up')} disabled={index === 0}
                    className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 disabled:opacity-20">
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
                  className={`${INPUT_CLS} flex-1`}
                  placeholder={`Step ${index + 1} title`}
                />
                <button onClick={() => removeStep(index)} disabled={steps.length === 1}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Step type selector */}
              <div className="flex gap-2">
                {(Object.entries(STEP_TYPE_LABELS) as [StepType, { label: string; icon: React.ReactNode }][]).map(([type, meta]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateStep(index, 'step_type', type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      step.step_type === type
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    {meta.icon}
                    {meta.label}
                  </button>
                ))}
              </div>

              {/* Content — always shown */}
              <textarea
                value={step.content}
                onChange={(e) => updateStep(index, 'content', e.target.value)}
                rows={3}
                className={`${INPUT_CLS} resize-none`}
                placeholder={
                  step.step_type === 'acknowledgement'
                    ? 'Statement the employee must acknowledge…'
                    : 'Describe exactly what to do in this step…'
                }
              />

              {/* Image URL — instruction only */}
              {step.step_type === 'instruction' && (
                <>
                  <input
                    type="url"
                    value={step.image_url}
                    onChange={(e) => updateStep(index, 'image_url', e.target.value)}
                    className={INPUT_CLS}
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
                </>
              )}

              {/* Video URL — video only */}
              {step.step_type === 'video' && (
                <input
                  type="url"
                  value={step.video_url}
                  onChange={(e) => updateStep(index, 'video_url', e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Video URL — YouTube, Vimeo, or direct mp4"
                />
              )}

              {/* Reorder buttons */}
              <div className="flex gap-2">
                <button onClick={() => moveStep(index, 'up')} disabled={index === 0}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30">
                  ↑ Move up
                </button>
                <button onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30">
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
        <Link href="/sops"><Button variant="secondary">Cancel</Button></Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : initialSOP ? 'Save changes' : 'Create SOP'}
        </Button>
      </div>
    </div>
  )
}
