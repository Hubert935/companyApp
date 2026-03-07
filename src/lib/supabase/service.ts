import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

/**
 * Service role client — bypasses RLS for server-side cron/webhook/OAuth handlers.
 * Never expose this client to the browser or return its data directly to untrusted callers.
 */
export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
