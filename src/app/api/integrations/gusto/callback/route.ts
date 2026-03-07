import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { exchangeCode } from '@/lib/integrations/gusto'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const url    = new URL(request.url)
    const code   = url.searchParams.get('code')
    const state  = url.searchParams.get('state')
    const errParam = url.searchParams.get('error')

    if (errParam) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/gusto?error=${encodeURIComponent(errParam)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/gusto?error=missing_params`
      )
    }

    // Validate state
    const cookieStore = await cookies()
    const savedState = cookieStore.get('gusto_oauth_state')?.value
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/gusto?error=invalid_state`
      )
    }
    cookieStore.delete('gusto_oauth_state')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login`)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id || !['owner', 'manager'].includes(profile.role)) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/gusto?error=forbidden`)
    }

    // Exchange code for tokens
    const tokens = await exchangeCode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const service = createServiceRoleClient()
    const { error } = await service
      .from('integrations')
      .upsert({
        company_id: profile.company_id,
        provider: 'gusto',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,provider' })

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/gusto?error=${encodeURIComponent(error.message)}`
      )
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/gusto?connected=true`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations/gusto?error=${encodeURIComponent(msg)}`
    )
  }
}
