import type { MentorThreadView, MentorMessage, CustomMentor } from '@/lib/types'
import {
  FIXTURE_MENTOR_THREADS,
  FIXTURE_MENTOR_MESSAGES,
  FIXTURE_CUSTOM_MENTORS,
} from '@/lib/mocks/mentor-fixtures'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

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
  return (data ?? []) as MentorThreadView[]
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

  return (data as MentorThreadView) ?? null
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
