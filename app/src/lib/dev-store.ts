import type { FeedItem } from '@/lib/types'

// Module-level singleton — only used when NEXT_PUBLIC_DEV_BYPASS_AUTH=true.
// In dev (single Node process) this persists across requests.
// In production this module is never reached because DEV_BYPASS is false.
export const devNewEntries: FeedItem[] = []
