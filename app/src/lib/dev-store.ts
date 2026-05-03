import type { FeedItem } from '@/lib/types'

// Next.js App Router compiles API routes and Server Components into separate
// bundle chunks, so module-level arrays are NOT shared between them.
// Storing the array on globalThis ensures a single instance across all chunks
// within the same Node.js process (dev only).
type DevGlobal = typeof globalThis & { _devNewEntries?: FeedItem[] }
const g = globalThis as DevGlobal
if (!g._devNewEntries) g._devNewEntries = []
export const devNewEntries: FeedItem[] = g._devNewEntries
