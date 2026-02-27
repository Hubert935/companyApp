'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Users, LogOut,
  ClipboardList, CreditCard, Sun, Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useDarkMode } from '@/hooks/useDarkMode'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile
  companyName: string
}

const ownerManagerLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sops',      label: 'SOPs',       icon: BookOpen },
  { href: '/employees', label: 'Team',        icon: Users },
  { href: '/onboarding', label: 'My Training', icon: ClipboardList },
  { href: '/billing',   label: 'Billing',     icon: CreditCard },
]

const employeeLinks = [
  { href: '/onboarding', label: 'My Training', icon: ClipboardList },
]

export default function Sidebar({ profile, companyName }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { isDark, toggle } = useDarkMode()

  const isOwnerOrManager = profile.role === 'owner' || profile.role === 'manager'
  const links = isOwnerOrManager ? ownerManagerLinks : employeeLinks

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const navLinkClass = (href: string) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
      pathname === href || pathname.startsWith(href + '/')
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
    )

  const actionBtnClass =
    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors'

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors">
        <div className="flex flex-col flex-1 min-h-0">

          {/* Workspace name */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">Workspace</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{companyName}</p>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={navLinkClass(href)}>
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Bottom: user info, dark toggle, sign out */}
          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0">
                {(profile.full_name ?? profile.email).slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {profile.full_name ?? 'You'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{profile.role}</p>
              </div>
            </div>

            <button onClick={toggle} className={actionBtnClass}>
              {isDark
                ? <Sun  className="w-5 h-5" />
                : <Moon className="w-5 h-5" />}
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>

            <button onClick={handleSignOut} className={actionBtnClass}>
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ──────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 transition-colors">
        <div className="flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              {label}
            </Link>
          ))}
          <button
            onClick={toggle}
            className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-500 dark:text-gray-400"
          >
            {isDark
              ? <Sun  className="w-5 h-5 mb-1" />
              : <Moon className="w-5 h-5 mb-1" />}
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>
      </nav>
    </>
  )
}
