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
      description: description ?? null,
      system_prompt: system_prompt.trim(),
      tone: tone ?? null,
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

  const { data, error } = await supabase
    .from('custom_mentors')
    .insert({
      user_id: user.id,
      name: name.trim(),
      description: description ?? null,
      system_prompt: system_prompt.trim(),
      tone: tone ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
