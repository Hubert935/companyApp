import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createMockClient } from '@/lib/mock/supabase'
import type { Database } from '@/types'

export async function createClient() {
  if (process.env.NEXT_PUBLIC_DEV_MOCK === 'true') {
    // Cast through unknown so TS accepts the mock shape as the typed client
    return createMockClient() as unknown as ReturnType<typeof createServerClient<Database>>
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies can't be set, middleware handles refresh
          }
        },
      },
    }
  )
}
