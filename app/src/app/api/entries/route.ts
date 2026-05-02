import { NextResponse } from 'next/server'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function POST(req: Request) {
  const formData = await req.formData()
  const content = (formData.get('content') as string | null) ?? ''
  const chainId = formData.get('chain_id') as string | null

  if (DEV_BYPASS) {
    const { devNewEntries } = await import('@/lib/dev-store')
    const newId = `entry-dev-${Date.now()}`
    const newChainId = chainId ?? `chain-dev-${Date.now()}`

    devNewEntries.unshift({
      kind: 'entry',
      id: newId,
      user_id: 'dev-user',
      chain_id: newChainId,
      content,
      image_urls: [],
      ai_status: 'pending',
      summary: null,
      tags: [],
      interpretation: null,
      helpful_info: null,
      related_entry_ids: [],
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ id: newId, chain_id: newChainId })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Create chain if not supplied
  let chainIdToUse = chainId
  if (!chainIdToUse) {
    const { data: chain, error: chainErr } = await supabase
      .from('chains')
      .insert({ user_id: user.id })
      .select('id')
      .single()
    if (chainErr) return NextResponse.json({ error: chainErr.message }, { status: 500 })
    chainIdToUse = chain.id
  }

  // Upload images (skip for now — Phase 5-3 focuses on text)
  const imageUrls: string[] = []

  const { data: entry, error: entryErr } = await supabase
    .from('entries')
    .insert({
      user_id: user.id,
      chain_id: chainIdToUse,
      content,
      image_urls: imageUrls,
      ai_status: 'pending',
    })
    .select('id, chain_id')
    .single()

  if (entryErr) return NextResponse.json({ error: entryErr.message }, { status: 500 })

  // Update chain updated_at so feed sorts correctly
  await supabase
    .from('chains')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chainIdToUse)

  return NextResponse.json({ id: entry.id, chain_id: entry.chain_id })
}
