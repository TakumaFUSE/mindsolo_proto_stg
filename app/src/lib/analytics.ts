type EventName = 'discover_click' | 'discover_affiliate_click' | 'mentor_start' | 'entry_save'

type EventProps = Record<string, string | number | boolean | null>

export function track(event: EventName, props?: EventProps): void {
  if (typeof window === 'undefined') return
  // TODO Phase 7: wire to analytics provider (PostHog / Mixpanel)
  if (process.env.NODE_ENV === 'development') {
    console.log('[analytics]', event, props)
  }
}
