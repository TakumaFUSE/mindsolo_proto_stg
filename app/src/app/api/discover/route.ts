import { NextResponse } from 'next/server'
import { getDiscoverTop, getDiscoverItem } from '@/lib/discover'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id) {
    const item = await getDiscoverItem(id)
    if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ item })
  }

  const categories = await getDiscoverTop()
  return NextResponse.json({ categories })
}
