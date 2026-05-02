import type { Entry } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type RelatedEntry = Pick<Entry, 'id' | 'summary' | 'content' | 'created_at' | 'tags'>

export type EntryDetail = Entry & {
  related_entries: RelatedEntry[]
  chain_thread_id: string | null
}

export async function getEntryDetail(
  supabase: SupabaseClient,
  id: string,
): Promise<EntryDetail | null> {
  const { data: entry } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!entry) return null

  const related_entries: RelatedEntry[] = []
  if (entry.related_entry_ids?.length) {
    const { data } = await supabase
      .from('entries')
      .select('id, summary, content, created_at, tags')
      .in('id', entry.related_entry_ids)
      .is('deleted_at', null)
    if (data) related_entries.push(...data)
  }

  const { data: threadData } = await supabase
    .from('mentor_threads')
    .select('id')
    .eq('chain_id', entry.chain_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    ...entry,
    related_entries,
    chain_thread_id: threadData?.id ?? null,
  }
}
