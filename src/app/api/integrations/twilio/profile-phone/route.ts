import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PhoneBody {
  phone_number: string
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { phone_number } = await request.json() as PhoneBody

    const { error } = await supabase
      .from('profiles')
      .update({ phone_number: phone_number || null })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
