import { createBrowserClient } from '@supabase/ssr'
import { createMockClient } from '@/lib/mock/supabase'
import type { Database } from '@/types'

export function createClient() {
  if (process.env.NEXT_PUBLIC_DEV_MOCK === 'true') {
    // Cast through unknown so TS accepts the mock shape as the typed client
    return createMockClient() as unknown as ReturnType<typeof createBrowserClient<Database>>
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
