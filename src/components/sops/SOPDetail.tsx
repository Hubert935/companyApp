import Link from 'next/link'
import { ArrowLeft, Video, CheckSquare } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import type { SOP, SOPStep, SOPCategory } from '@/types'

// ─── Video embed helper ───────────────────────────────────────────────────────
function getVideoEmbed(url: string): { type: 'iframe' | 'video'; src: string } | null {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return { type: 'iframe', src: `https://www.youtube.com/embed/${ytMatch[1]}` }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { type: 'video', src: url }
  return { type: 'iframe', src: url }
}

interface SOPDetailProps {
  sop: SOP & { steps: SOPStep[]; sop_categories?: SOPCategory | null }
}

export default function SOPDetail({ sop }: SOPDetailProps) {
  const cat = sop.sop_categories

  return (
    <div className="space-y-6">
      <Link
        href="/onboarding"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to training
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sop.title}</h1>
        {sop.description && (
          <p className="text-gray-500 dark:text-gray-400 mt-1">{sop.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {cat ? (
            <Badge variant={cat.color as BadgeVariant}>{cat.name}</Badge>
          ) : sop.category ? (
            <Badge variant="gray">{sop.category}</Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {sop.steps.map((step, index) => {
          const embed = step.step_type === 'video' && step.video_url
            ? getVideoEmbed(step.video_url)
            : null

          return (
            <div
              key={step.id}
              className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 ${
                step.step_type === 'acknowledgement'
                  ? 'border-amber-200 dark:border-amber-800/50'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Step number / type icon */}
                {step.step_type === 'acknowledgement' ? (
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckSquare className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  </div>
                ) : step.step_type === 'video' ? (
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Video className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                    {step.step_type === 'acknowledgement' && (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                        Acknowledgement
                      </span>
                    )}
                    {step.step_type === 'video' && (
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                        Video
                      </span>
                    )}
                  </div>

                  {step.content && (
                    <p className={`text-sm whitespace-pre-wrap ${
                      step.step_type === 'acknowledgement'
                        ? 'text-amber-700 dark:text-amber-300 italic'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.content}
                    </p>
                  )}

                  {/* Video embed */}
                  {embed && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video">
                      {embed.type === 'iframe' ? (
                        <iframe
                          src={embed.src}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video src={embed.src} controls className="w-full h-full" />
                      )}
                    </div>
                  )}

                  {step.image_url && step.step_type === 'instruction' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={step.image_url}
                      alt={step.title}
                      className="mt-3 w-full rounded-xl border border-gray-200 dark:border-gray-700 object-cover max-h-64"
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
