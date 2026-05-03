import { NextResponse } from 'next/server'
import {
  generateSummary,
  generateInterpretation,
  generateInsight,
  devGenerateSummary,
  devGenerateInterpretation,
  devGenerateInsight,
} from '@/lib/generate'
import { getRelatedEntries } from '@/lib/related'
import type { RelatedEntry } from '@/lib/entry'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

type Params = Promise<{ id: string }>

const encoder = new TextEncoder()

function sseChunk(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params

  if (DEV_BYPASS) {
    return handleDev(id)
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: entry } = await supabase
    .from('entries')
    .select('id, content, summary, interpretation, helpful_info, related_entry_ids, chain_id, topics, ai_status, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (!entry) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Already generated — send done immediately
  if (entry.summary && entry.interpretation && entry.helpful_info) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sseChunk('done', {}))
        controller.close()
      },
    })
    return new Response(stream, sseHeaders())
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: string, data: unknown) => {
        try { controller.enqueue(sseChunk(event, data)) } catch { /* client disconnected */ }
      }

      const collected: {
        summary: string
        interpretation: string
        helpful_info: string
        related_entry_ids: string[]
        related_entries: RelatedEntry[]
      } = { summary: '', interpretation: '', helpful_info: '', related_entry_ids: [], related_entries: [] }

      try {
        await Promise.all([
          generateSummary(entry.content).then(v => {
            collected.summary = v
            enqueue('summary', { value: v })
          }),
          generateInterpretation(entry.content).then(v => {
            collected.interpretation = v
            enqueue('interpretation', { value: v })
          }),
          generateInsight(entry.content, entry.topics ?? []).then(v => {
            collected.helpful_info = v
            enqueue('insight', { value: v })
          }),
          getRelatedEntries(entry.id, entry.chain_id, entry.topics ?? [], user.id).then(related => {
            collected.related_entry_ids = related.map(r => r.id)
            collected.related_entries = related
            enqueue('related', { value: related })
          }),
        ])

        // Persist to DB
        await supabase
          .from('entries')
          .update({
            summary: collected.summary,
            interpretation: collected.interpretation,
            helpful_info: collected.helpful_info,
            related_entry_ids: collected.related_entry_ids,
            ai_status: 'done',
          })
          .eq('id', entry.id)

        enqueue('done', {})
      } catch (err) {
        enqueue('error', { message: String(err) })
        await supabase
          .from('entries')
          .update({ ai_status: 'error' })
          .eq('id', entry.id)
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, sseHeaders())
}

// ─── Dev bypass ──────────────────────────────────────────────────────────────

async function handleDev(id: string) {
  const { devNewEntries } = await import('@/lib/dev-store')
  const { FIXTURE_ENTRY_DETAILS } = await import('@/lib/mocks/entry-fixtures')

  // Find entry in dev store or fixtures
  const devEntry = (devNewEntries as Array<{
    kind: string; id: string; content: string; summary: string | null; interpretation: string | null; helpful_info: string | null; chain_id: string; topics: string[]
  }>).find(e => e.kind === 'entry' && e.id === id)

  const fixtureEntry = FIXTURE_ENTRY_DETAILS.find(e => e.id === id)

  // Already generated
  if (fixtureEntry?.summary && fixtureEntry?.interpretation && fixtureEntry?.helpful_info) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sseChunk('done', {}))
        controller.close()
      },
    })
    return new Response(stream, sseHeaders())
  }

  if (devEntry?.summary && devEntry?.interpretation && devEntry?.helpful_info) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sseChunk('done', {}))
        controller.close()
      },
    })
    return new Response(stream, sseHeaders())
  }

  const content = devEntry?.content ?? fixtureEntry?.content ?? ''
  const chainId = devEntry?.chain_id ?? fixtureEntry?.chain_id ?? ''
  const topics = devEntry?.topics ?? (fixtureEntry as (typeof fixtureEntry & { topics?: string[] }))?.topics ?? []

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: string, data: unknown) => {
        try { controller.enqueue(sseChunk(event, data)) } catch { /* disconnected */ }
      }

      try {
        await Promise.all([
          devGenerateSummary(content).then(v => {
            if (devEntry) devEntry.summary = v
            enqueue('summary', { value: v })
          }),
          devGenerateInterpretation(content).then(v => {
            if (devEntry) devEntry.interpretation = v
            enqueue('interpretation', { value: v })
          }),
          devGenerateInsight(topics).then(v => {
            if (devEntry) devEntry.helpful_info = v
            enqueue('insight', { value: v })
          }),
          getRelatedEntries(id, chainId, topics, 'dev-user').then(related => {
            enqueue('related', { value: related })
          }),
        ])
        enqueue('done', {})
      } catch (err) {
        enqueue('error', { message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, sseHeaders())
}

function sseHeaders(): ResponseInit {
  return {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  }
}
