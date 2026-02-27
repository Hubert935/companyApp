import Sidebar from './Sidebar'
import type { Profile, Company } from '@/types'

interface AppShellProps {
  profile: Profile
  company: Company
  children: React.ReactNode
}

export default function AppShell({ profile, company, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Sidebar profile={profile} companyName={company.name} />
      <main className="md:pl-64 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
