import { NextResponse } from 'next/server'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function POST(req: Request) {
  const { name, description, system_prompt, tone } = await req.json() as {
    name: string
    description?: string | null
    system_prompt: string
    tone?: string | null
  }

  if (!name?.trim() || !system_prompt?.trim()) {
    return NextResponse.json({ error: 'name and system_prompt are required' }, { status: 400 })
  }

  if (DEV_BYPASS) {
    const { devCustomMentors } = await import('@/lib/dev-store')

    const newMentor = {
      id: `custom-dev-${Date.now()}`,
      user_id: 'dev-user',
      name: name.trim(),
      description: description?.trim() || null,
      system_prompt: system_prompt.trim(),
      tone: tone?.trim() || null,
      created_at: new Date().toISOString(),
    }

    devCustomMentors.unshift(newMentor)
    return NextResponse.json({ id: newMentor.id })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // description は DB で NOT NULL だった列だが 0006 で nullable 化済み。
  // role は 0005 で DEFAULT 'mentor' + nullable になったので payload から外す。
  const payload: Record<string, unknown> = {
    user_id: user.id,
    name: name.trim(),
    system_prompt: system_prompt.trim(),
    tone: tone?.trim() || null,
  }
  if (description?.trim()) {
    payload.description = description.trim()
  }

  const { data, error } = await supabase
    .from('custom_mentors')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    console.error('[POST /api/mentors] insert error', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: 500 },
    )
  }
  return NextResponse.json({ id: data.id })
}
