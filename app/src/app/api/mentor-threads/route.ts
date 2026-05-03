import { NextResponse } from 'next/server'
import { PERSONAS, getPersonaById } from '@/lib/personas'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function POST(req: Request) {
  const { persona_id, mentor_id, is_builtin, chain_id } = await req.json() as {
    persona_id?: string
    mentor_id?: string
    is_builtin?: boolean
    chain_id?: string
  }

  if (DEV_BYPASS) {
    const { devMentorThreads } = await import('@/lib/dev-store')

    let mentor_name = 'メンター'
    let mentor_avatar = 'M'

    if (is_builtin && persona_id) {
      const persona = getPersonaById(persona_id)
      if (persona) {
        mentor_name = persona.name
        mentor_avatar = persona.avatar
      }
    } else if (mentor_id) {
      const { devCustomMentors } = await import('@/lib/dev-store')
      const { FIXTURE_CUSTOM_MENTORS } = await import('@/lib/mocks/mentor-fixtures')
      const mentor =
        devCustomMentors.find(m => m.id === mentor_id) ??
        FIXTURE_CUSTOM_MENTORS.find(m => m.id === mentor_id)
      if (mentor) {
        mentor_name = mentor.name
        mentor_avatar = mentor.name.charAt(0)
      }
    }

    const newThread = {
      id: `mthread-dev-${Date.now()}`,
      user_id: 'dev-user',
      chain_id: chain_id ?? null,
      mentor_id: mentor_id ?? null,
      persona_id: persona_id ?? null,
      is_builtin: is_builtin ?? false,
      mentor_name,
      mentor_avatar,
      title: null,
      last_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    devMentorThreads.unshift(newThread)
    return NextResponse.json({ id: newThread.id })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('mentor_threads')
    .insert({
      user_id: user.id,
      chain_id: chain_id ?? null,
      mentor_id: mentor_id ?? null,
      persona_id: persona_id ?? null,
      is_builtin: is_builtin ?? false,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
