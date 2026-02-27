import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { SOP, SOPStep } from '@/types'

interface SOPDetailProps {
  sop: SOP & { steps: SOPStep[] }
}

export default function SOPDetail({ sop }: SOPDetailProps) {
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
        {sop.category && (
          <Badge variant="blue" className="mt-2">
            {sop.category}
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {sop.steps.map((step, index) => (
          <div key={step.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{step.title}</h3>
                {step.content && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{step.content}</p>
                )}
                {step.image_url && (
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
        ))}
      </div>
    </div>
  )
}
