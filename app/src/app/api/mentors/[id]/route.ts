import { NextResponse } from 'next/server'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

type Params = Promise<{ id: string }>

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params

  if (DEV_BYPASS) {
    const { devCustomMentors } = await import('@/lib/dev-store')
    const { FIXTURE_CUSTOM_MENTORS } = await import('@/lib/mocks/mentor-fixtures')
    const mentor =
      devCustomMentors.find(m => m.id === id) ??
      FIXTURE_CUSTOM_MENTORS.find(m => m.id === id) ??
      null
    if (!mentor) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ mentor })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('custom_mentors')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ mentor: data })
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id } = await params
  const { name, description, system_prompt, tone } = (await req.json()) as {
    name?: string
    description?: string | null
    system_prompt?: string
    tone?: string | null
  }

  if (DEV_BYPASS) {
    const { devCustomMentors } = await import('@/lib/dev-store')
    const mentor = devCustomMentors.find(m => m.id === id)
    if (!mentor) return NextResponse.json({ error: 'not found' }, { status: 404 })

    if (name !== undefined) mentor.name = name.trim()
    if (description !== undefined) mentor.description = description
    if (system_prompt !== undefined) mentor.system_prompt = system_prompt.trim()
    if (tone !== undefined) mentor.tone = tone

    return NextResponse.json({ id })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description
  if (system_prompt !== undefined) updates.system_prompt = system_prompt.trim()
  if (tone !== undefined) updates.tone = tone

  const { error } = await supabase
    .from('custom_mentors')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id })
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params

  if (DEV_BYPASS) {
    const { devCustomMentors } = await import('@/lib/dev-store')
    const idx = devCustomMentors.findIndex(m => m.id === id)
    if (idx !== -1) devCustomMentors.splice(idx, 1)
    return NextResponse.json({ ok: true })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('custom_mentors')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
