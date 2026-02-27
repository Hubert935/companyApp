import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Uses service role to bypass RLS — safe because we verify the user session first
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const { companyName } = await request.json()

    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Verify the user is authenticated via their session cookie
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const service = getServiceClient()

    // Check if user already has a company (prevent duplicates on retry)
    const { data: existingProfile } = await service
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (existingProfile?.company_id) {
      return NextResponse.json({ success: true }) // already set up
    }

    // Create company with service role (bypasses RLS)
    const { data: company, error: companyError } = await service
      .from('companies')
      .insert({ name: companyName.trim(), owner_id: user.id })
      .select()
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: companyError?.message ?? 'Failed to create company' },
        { status: 500 }
      )
    }

    // Link profile to company and set role
    const { error: profileError } = await service
      .from('profiles')
      .update({ company_id: company.id, role: 'owner' })
      .eq('id', user.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
