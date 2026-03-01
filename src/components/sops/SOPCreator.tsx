'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import SOPEditor from './SOPEditor'
import Button from '@/components/ui/Button'
import type { SOPCategory, SOP, SOPStep } from '@/types'

interface SOPCreatorProps {
  companyId: string
  userId: string
  categories: SOPCategory[]
}

// Shape returned by the API — matches what SOPEditor reads from initialSOP
interface GeneratedStep {
  position: number
  step_type: 'instruction' | 'video' | 'acknowledgement'
  title: string
  content: string
  image_url: string
  video_url: string
}

interface GeneratedSOP {
  title: string
  description: string
  steps: GeneratedStep[]
}

const PLACEHOLDER = `e.g. "How to open the store: Arrive 30 minutes early, unlock the back door using the key box code, turn on all the lights, power up the register, count the cash drawer, check the floor for anything out of place, then unlock the front door at opening time. Make sure the 'Staff only' sign is removed from the back hallway."`

export default function SOPCreator({
  companyId,
  userId,
  categories,
}: SOPCreatorProps) {
  const [open, setOpen] = useState(true)
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Key forces SOPEditor to remount (re-initialise state) when new data arrives
  const [generationKey, setGenerationKey] = useState(0)
  const [generatedSOP, setGeneratedSOP] = useState<GeneratedSOP | null>(null)

  async function handleGenerate() {
    if (!description.trim()) return
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/sops/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })

      const data = await res.json() as GeneratedSOP & { error?: string }

      if (!res.ok) {
        throw new Error(data.error ?? 'Generation failed')
      }

      setGeneratedSOP(data)
      setGenerationKey((k) => k + 1)
      setOpen(false) // collapse the panel so the editor gets focus
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  // Cast the generated data into the shape SOPEditor expects (same fields are used)
  const initialSOP = generatedSOP
    ? (generatedSOP as unknown as SOP & { steps: SOPStep[] })
    : undefined

  return (
    <div className="space-y-4">
      {/* ─── AI Generation Panel ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/30 dark:to-blue-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl overflow-hidden">
        {/* Header / toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              Generate with AI
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Describe your process in plain language — Claude will structure it into steps
            </p>
          </div>
          {open ? (
            <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          )}
        </button>

        {/* Body */}
        {open && (
          <div className="px-5 pb-5 space-y-3">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={generating}
              placeholder={PLACEHOLDER}
              rows={5}
              className="w-full px-3 py-2.5 border border-violet-200 dark:border-violet-700 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none disabled:opacity-50"
            />

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleGenerate}
                disabled={generating || !description.trim()}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate SOP
                  </>
                )}
              </Button>

              {generatedSOP && (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                  ✓ SOP generated — review and save below
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── SOP Editor (re-mounts on each generation) ─────────────────── */}
      <SOPEditor
        key={generationKey}
        companyId={companyId}
        userId={userId}
        categories={categories}
        initialSOP={initialSOP}
      />
    </div>
  )
}
