import { getPersonaById } from '@/lib/personas'
import type { MentorThreadView, MentorMessage, CustomMentor } from '@/lib/types'
import {
  FIXTURE_MENTOR_THREADS,
  FIXTURE_MENTOR_MESSAGES,
  FIXTURE_CUSTOM_MENTORS,
} from '@/lib/mocks/mentor-fixtures'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

type RawThread = {
  id: string
  user_id: string
  chain_id: string | null
  mentor_id: string | null
  persona_id: string | null
  is_builtin: boolean
  title: string | null
  created_at: string
  updated_at: string
}

// Resolve mentor_name / mentor_avatar for an array of raw DB rows.
// Batches custom_mentors lookup to avoid N+1.
async function resolveThreadViews(
  rows: RawThread[],
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server')['createClient']>>,
): Promise<MentorThreadView[]> {
  // Collect IDs that need a custom_mentors lookup
  const customIds = new Set<string>()
  for (const t of rows) {
    if (t.is_builtin && t.persona_id && !getPersonaById(t.persona_id)) {
      // persona_id is a UUID → legacy custom mentor stored as builtin
      customIds.add(t.persona_id)
    }
    if (!t.is_builtin && t.mentor_id) {
      customIds.add(t.mentor_id)
    }
  }

  let mentorMap = new Map<string, string>() // id → name
  if (customIds.size > 0) {
    const { data } = await supabase
      .from('custom_mentors')
      .select('id, name')
      .in('id', [...customIds])
    if (data) {
      mentorMap = new Map(data.map((m: { id: string; name: string }) => [m.id, m.name]))
    }
  }

  return rows.map(t => {
    let mentor_name = 'メンター'
    let mentor_avatar = 'M'

    if (t.is_builtin && t.persona_id) {
      const persona = getPersonaById(t.persona_id)
      if (persona) {
        mentor_name = persona.name
        mentor_avatar = persona.avatar
      } else {
        const name = mentorMap.get(t.persona_id)
        if (name) {
          mentor_name = name
          mentor_avatar = name.charAt(0)
        }
      }
    } else if (!t.is_builtin && t.mentor_id) {
      const name = mentorMap.get(t.mentor_id)
      if (name) {
        mentor_name = name
        mentor_avatar = name.charAt(0)
      }
    }

    return {
      ...t,
      mentor_name,
      mentor_avatar,
      last_message: null,
    } as MentorThreadView
  })
}

export async function getThreads(userId: string): Promise<MentorThreadView[]> {
  if (DEV_BYPASS) {
    const { devMentorThreads } = await import('@/lib/dev-store')
    return [...devMentorThreads, ...FIXTURE_MENTOR_THREADS].filter(
      t => t.user_id === userId || userId === 'dev-user',
    )
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('mentor_threads')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return resolveThreadViews((data ?? []) as RawThread[], supabase)
}

export async function getThread(threadId: string): Promise<MentorThreadView | null> {
  if (DEV_BYPASS) {
    const { devMentorThreads } = await import('@/lib/dev-store')
    return (
      devMentorThreads.find(t => t.id === threadId) ??
      FIXTURE_MENTOR_THREADS.find(t => t.id === threadId) ??
      null
    )
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data } = await supabase
    .from('mentor_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (!data) return null
  const [resolved] = await resolveThreadViews([data as RawThread], supabase)
  return resolved ?? null
}

export async function getMessages(threadId: string): Promise<MentorMessage[]> {
  if (DEV_BYPASS) {
    const { devMentorMessages } = await import('@/lib/dev-store')
    return (
      devMentorMessages[threadId] ?? FIXTURE_MENTOR_MESSAGES[threadId] ?? []
    )
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('mentor_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as MentorMessage[]
}

export async function getCustomMentors(userId: string): Promise<CustomMentor[]> {
  if (DEV_BYPASS) {
    const { devCustomMentors } = await import('@/lib/dev-store')
    return [
      ...devCustomMentors.filter(m => m.user_id === userId || userId === 'dev-user'),
      ...FIXTURE_CUSTOM_MENTORS,
    ]
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('custom_mentors')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as CustomMentor[]
}
