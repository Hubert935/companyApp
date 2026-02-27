import { cn, getProgressColor } from '@/lib/utils'

interface ProgressBarProps {
  value: number // 0–100
  className?: string
  showLabel?: boolean
}

export default function ProgressBar({ value, className, showLabel = false }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-2 rounded-full transition-all duration-500', getProgressColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-10 text-right">{pct}%</span>
      )}
    </div>
  )
}
