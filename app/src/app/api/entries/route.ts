import { NextResponse } from 'next/server'
import { extractTopics } from '@/lib/topics'
import { assignChain } from '@/lib/chain'
import { randomUUID } from 'crypto'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function POST(req: Request) {
  const formData = await req.formData()
  const content = (formData.get('content') as string | null) ?? ''
  const chainIdParam = formData.get('chain_id') as string | null

  if (DEV_BYPASS) {
    const { devNewEntries } = await import('@/lib/dev-store')

    const topics = await extractTopics(content)
    const assigned = await assignChain('dev-user', topics)
    const chainId = chainIdParam ?? (assigned || randomUUID())
    const newId = `entry-dev-${Date.now()}`

    devNewEntries.unshift({
      kind: 'entry',
      id: newId,
      user_id: 'dev-user',
      chain_id: chainId,
      content,
      image_urls: [],
      ai_status: 'pending',
      summary: null,
      tags: [],
      topics,
      interpretation: null,
      helpful_info: null,
      related_entry_ids: [],
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ id: newId, chain_id: chainId, topics })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const topics = await extractTopics(content)

  // Determine chain_id: explicit param → topic-overlap match → new chain → null fallback
  let chainIdToUse: string | null = chainIdParam ?? null
  if (!chainIdToUse) {
    const assigned = await assignChain(user.id, topics)
    if (assigned) {
      chainIdToUse = assigned
    } else {
      const { data: chain, error: chainErr } = await supabase
        .from('chains')
        .insert({ user_id: user.id })
        .select('id')
        .single()
      if (chainErr) {
        console.error('[POST /api/entries] chain insert error', {
          message: chainErr.message,
          code: chainErr.code,
          details: chainErr.details,
          hint: chainErr.hint,
        })
      } else {
        chainIdToUse = chain.id
      }
    }
  }

  const { data: entry, error: entryErr } = await supabase
    .from('entries')
    .insert({
      id: randomUUID(),
      user_id: user.id,
      chain_id: chainIdToUse,
      title: '',
      content,
      word_count: content.length,
      image_urls: null,
      ai_status: 'pending',
      topics: topics.length ? topics : [],
      tags: [],
      related_entry_ids: [],
    })
    .select('id, chain_id, topics')
    .single()

  if (entryErr) {
    console.error('[POST /api/entries] insert error', {
      message: entryErr.message,
      code: entryErr.code,
      details: entryErr.details,
      hint: entryErr.hint,
    })
    return NextResponse.json(
      { error: entryErr.message, code: entryErr.code, details: entryErr.details },
      { status: 500 },
    )
  }

  await supabase
    .from('chains')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chainIdToUse)

  return NextResponse.json({ id: entry.id, chain_id: entry.chain_id, topics: entry.topics })
}
