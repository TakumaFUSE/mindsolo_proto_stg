export const PLAN_FEATURES = {
  entry_ai_processing:    'free',
  mentor_chat:            'free',
  discover:               'free',
  reflection_suggestions: 'free',
} satisfies Record<string, 'free' | 'pro'>

export type PlanFeature = keyof typeof PLAN_FEATURES
export type Plan = 'free' | 'pro'

export function isPlanAllowed(feature: PlanFeature, userPlan: Plan): boolean {
  const required = PLAN_FEATURES[feature]
  if (required === 'free') return true
  return userPlan === 'pro'
}
