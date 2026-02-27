import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      try {
        // After exchanging the code the session cookie is set — fetch the user
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (!user || userError) {
          return NextResponse.redirect(`${origin}${next}`)
        }

        // Check for a pending invite for this email and, if present, join the user to the company
        const service = getServiceClient()

        const { data: invite } = await service
          .from('invites')
          .select('*')
          .eq('email', user.email)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .limit(1)
          .single()

        if (invite) {
          // Update the profile to link to the company and set role
          await service
            .from('profiles')
            .update({ company_id: invite.company_id, role: invite.role, invited_by: invite.invited_by })
            .eq('id', user.id)

          // Mark invite as accepted
          await service.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
        }
      } catch (err) {
        // swallow errors — users should still be logged in even if invite processing fails
        console.error('invite processing error', err)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
}
