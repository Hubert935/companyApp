import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600':
            variant === 'primary',
          'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700':
            variant === 'secondary',
          'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600':
            variant === 'danger',
          'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800':
            variant === 'ghost',
        },
        {
          'text-xs px-3 py-1.5 gap-1.5': size === 'sm',
          'text-sm px-4 py-2.5 gap-2':   size === 'md',
          'text-base px-6 py-3 gap-2':   size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
