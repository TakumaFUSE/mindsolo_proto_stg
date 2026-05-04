// Database row types — snake_case as returned by Supabase

export type Profile = {
  id: string
  display_name: string
  plan: 'free' | 'pro'
  font_size: 'small' | 'normal' | 'large'
  language: 'ja' | 'en'
  created_at: string
  updated_at: string
}

export type Chain = {
  id: string
  user_id: string
  updated_at: string
  created_at: string
}

export type Entry = {
  id: string
  user_id: string
  chain_id: string
  content: string
  image_urls: string[]
  ai_status: 'pending' | 'processing' | 'done' | 'error'
  summary: string | null
  tags: string[]
  topics: string[]
  interpretation: string | null
  helpful_info: string | null
  related_entry_ids: string[]
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type MentorTemplate = {
  id: string
  name: string
  description: string
  system_prompt: string
  order_index: number
  created_at: string
}

export type MentorThread = {
  id: string
  user_id: string
  chain_id: string
  mentor_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export type MentorMessage = {
  id: string
  thread_id: string
  role: 'user' | 'assistant'
  content: string
  image_urls: string[]
  created_at: string
}

export type ReflectionSuggestion = {
  id: string
  user_id: string
  content: string
  read_at: string | null
  created_at: string
}

export type DiscoverItemType = {
  id: string
  name: string
  order_index: number
  created_at: string
}

export type DiscoverCategory = {
  id: string
  name: string
  order_index: number
  created_at: string
}

export type DiscoverRecommendation = {
  id: string
  user_id: string
  item_type_id: string | null
  category_id: string | null
  title: string
  description: string
  tag: 'just_for_you' | 'expand'
  affiliate_url: string | null
  image_url: string | null
  created_at: string
}

export type DiscoverLike = {
  id: string
  user_id: string
  recommendation_id: string | null
  title: string
  affiliate_url: string | null
  item_type_id: string | null
  category_id: string | null
  tag: 'just_for_you' | 'expand'
  liked_at: string
}

// Feed item union type — entries and threads appear in the same chain list
export type FeedItem =
  | ({ kind: 'entry' } & Entry)
  | ({ kind: 'thread' } & MentorThread & { mentor_name: string })

export type CustomMentor = {
  id: string
  user_id: string
  name: string
  description: string | null
  system_prompt: string
  tone: string | null
  created_at: string
}

export type MentorThreadView = {
  id: string
  user_id: string
  chain_id: string | null
  mentor_id: string | null
  persona_id: string | null
  is_builtin: boolean
  mentor_name: string
  mentor_avatar: string
  title: string | null
  last_message: string | null
  created_at: string
  updated_at: string
}

export type CuratedDiscoverItem = {
  id: string
  category_key: string
  title: string
  description: string
  reason: string
  image_url: string
  affiliate_url: string | null
  tags: string[]
}

export type DiscoverCategoryGroup = {
  key: string
  label: string
  emoji: string
  items: CuratedDiscoverItem[]
}
