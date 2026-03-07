import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { exchangeCode } from '@/lib/integrations/slack'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const url       = new URL(request.url)
    const code      = url.searchParams.get('code')
    const state     = url.searchParams.get('state')
    const errParam  = url.searchParams.get('error')

    if (errParam) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack?error=${encodeURIComponent(errParam)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack?error=missing_params`
      )
    }

    // Validate CSRF state
    const cookieStore = await cookies()
    const savedState = cookieStore.get('slack_oauth_state')?.value
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack?error=invalid_state`
      )
    }
    cookieStore.delete('slack_oauth_state')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login`)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id || !['owner', 'manager'].includes(profile.role)) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack?error=forbidden`)
    }

    const tokens = await exchangeCode(code)
    if (!tokens.ok || !tokens.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack?error=${encodeURIComponent(tokens.error ?? 'token_exchange_failed')}`
      )
    }

    const service = createServiceRoleClient()
    const { error } = await service
      .from('integrations')
      .upsert({
        company_id: profile.company_id,
        provider: 'slack',
        access_token: tokens.access_token,
        config: {
          team_id: tokens.team?.id,
          team_name: tokens.team?.name,
          bot_user_id: tokens.bot_user_id,
          // Default channel can be updated in settings
          channel_id: null,
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,provider' })

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack?error=${encodeURIComponent(error.message)}`
      )
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack?connected=true`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/integrations/slack?error=${encodeURIComponent(msg)}`
    )
  }
}
