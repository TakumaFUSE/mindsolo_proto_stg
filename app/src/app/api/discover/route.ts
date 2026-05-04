import { NextResponse } from 'next/server'
import { getDiscoverTop, getDiscoverItem } from '@/lib/discover'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (DEV_BYPASS) {
    if (id) {
      const item = await getDiscoverItem(id)
      if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
      return NextResponse.json({ item })
    }
    const categories = await getDiscoverTop()
    return NextResponse.json({ categories })
  }

  // Production: personalized recommendations
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (id) {
    // Fetch user topics to look up AI-generated item from cache
    const { data: recentEntries } = await supabase
      .from('entries')
      .select('topics')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20)

    const topics: string[] = Array.from(
      new Set((recentEntries ?? []).flatMap(e => e.topics ?? [])),
    ).slice(0, 20)

    const { getDiscoverItemForUser } = await import('@/lib/discover')
    const item = await getDiscoverItemForUser(id, user.id, topics)
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ item })
  }

  // Fetch user topics from last 14 days
  const { data: recentEntries } = await supabase
    .from('entries')
    .select('topics')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .limit(20)

  const topics: string[] = Array.from(
    new Set((recentEntries ?? []).flatMap(e => e.topics ?? [])),
  ).slice(0, 20)

  const { getDiscoverForUser } = await import('@/lib/discover')
  const categories = await getDiscoverForUser(user.id, topics)
  return NextResponse.json({ categories, topics })
}
