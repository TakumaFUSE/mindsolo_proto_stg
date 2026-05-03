import type { FeedItem, MentorThreadView, MentorMessage, CustomMentor } from '@/lib/types'

// Next.js App Router compiles API routes and Server Components into separate
// bundle chunks, so module-level arrays are NOT shared between them.
// Storing on globalThis ensures a single instance across all chunks
// within the same Node.js process (dev only).
type DevGlobal = typeof globalThis & {
  _devNewEntries?: FeedItem[]
  _devMentorThreads?: MentorThreadView[]
  _devCustomMentors?: CustomMentor[]
  _devMentorMessages?: Record<string, MentorMessage[]>
}

const g = globalThis as DevGlobal

if (!g._devNewEntries) g._devNewEntries = []
if (!g._devMentorThreads) g._devMentorThreads = []
if (!g._devCustomMentors) g._devCustomMentors = []
if (!g._devMentorMessages) g._devMentorMessages = {}

export const devNewEntries: FeedItem[] = g._devNewEntries
export const devMentorThreads: MentorThreadView[] = g._devMentorThreads
export const devCustomMentors: CustomMentor[] = g._devCustomMentors
export const devMentorMessages: Record<string, MentorMessage[]> = g._devMentorMessages
