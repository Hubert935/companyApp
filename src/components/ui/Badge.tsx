import { cn } from '@/lib/utils'

type BadgeVariant = 'green' | 'blue' | 'orange' | 'gray' | 'red'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-green-100  dark:bg-green-900/40  text-green-700  dark:text-green-400',
  blue:   'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-400',
  orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
  gray:   'bg-gray-100   dark:bg-gray-800       text-gray-600   dark:text-gray-400',
  red:    'bg-red-100    dark:bg-red-900/40     text-red-700    dark:text-red-400',
}

export default function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
