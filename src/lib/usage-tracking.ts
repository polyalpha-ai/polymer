import { createClient } from '@/utils/supabase/server'
import { PolarEventTracker } from './polar-events'

// Store current analysis context
let currentAnalysisContext: { userId?: string; customerId?: string } = {}

export function setAnalysisContext(userId: string, customerId: string) {
  currentAnalysisContext = { userId, customerId }
}

export function clearAnalysisContext() {
  currentAnalysisContext = {}
}

export async function trackValyuUsageImmediate(
  cost: number,
  query: string,
  searchType: string
) {
  if (!currentAnalysisContext.customerId || !currentAnalysisContext.userId) {
    console.log('[trackValyuUsageImmediate] No customer ID in context, skipping tracking')
    return
  }

  try {
    const tracker = new PolarEventTracker()
    await tracker.trackValyuAPIUsage(
      currentAnalysisContext.userId,
      currentAnalysisContext.customerId,
      searchType,
      cost,
      {
        query,
        timestamp: new Date().toISOString()
      }
    )
  } catch (error) {
    console.error('Error tracking Valyu usage:', error)
  }
}


export async function checkUsageLimit(userId: string): Promise<{ canProceed: boolean; reason?: string }> {
  const supabase = await createClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status, analyses_remaining')
    .eq('id', userId)
    .single()

  if (!user) {
    return { canProceed: false, reason: 'User not found' }
  }

  if (user.subscription_tier === 'subscription') {
    if (user.subscription_status !== 'active') {
      return { canProceed: false, reason: 'Subscription is not active' }
    }
    if (user.analyses_remaining <= 0) {
      return { canProceed: false, reason: 'Monthly analysis limit reached' }
    }
    return { canProceed: true }
  }

  if (user.subscription_tier === 'pay_per_use') {
    return { canProceed: true }
  }

  return { canProceed: false, reason: 'No active subscription or payment method' }
}

export async function decrementAnalysisCount(userId: string) {
  const supabase = await createClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier, analyses_remaining')
    .eq('id', userId)
    .single()

  if (user?.subscription_tier === 'subscription' && user.analyses_remaining > 0) {
    await supabase
      .from('users')
      .update({
        analyses_remaining: user.analyses_remaining - 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }
}