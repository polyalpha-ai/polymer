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
  // In development mode, allow unlimited usage (default to development)
  if (process.env.NEXT_PUBLIC_APP_MODE !== 'production') {
    return { canProceed: true }
  }

  const supabase = await createClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier, subscription_status, analyses_remaining, polar_customer_id')
    .eq('id', userId)
    .single()

  if (!user) {
    console.log('[checkUsageLimit] User not found for ID:', userId)
    return { canProceed: false, reason: 'User not found' }
  }

  console.log('[checkUsageLimit] User data:', JSON.stringify(user, null, 2))
  console.log('[checkUsageLimit] Subscription tier type:', typeof user.subscription_tier)
  console.log('[checkUsageLimit] Subscription tier value:', `"${user.subscription_tier}"`)

  // Handle subscription tier
  if (user.subscription_tier === 'subscription') {
    console.log('[checkUsageLimit] Processing subscription user')
    if (user.subscription_status !== 'active') {
      return { canProceed: false, reason: 'Subscription is not active' }
    }
    if (user.analyses_remaining <= 0) {
      return { canProceed: false, reason: 'Monthly analysis limit reached' }
    }
    return { canProceed: true }
  }

  // Handle pay-per-use tier - be more flexible with string matching
  if (user.subscription_tier === 'pay_per_use' || user.subscription_tier?.trim() === 'pay_per_use') {
    console.log('[checkUsageLimit] Processing pay_per_use user')
    
    if (!user.polar_customer_id) {
      console.log('[checkUsageLimit] No polar_customer_id found')
      return { canProceed: false, reason: 'Payment method not set up for pay-per-use billing' }
    }
    
    if (user.subscription_status !== 'active') {
      console.log('[checkUsageLimit] Pay-per-use status not active:', user.subscription_status)
      return { canProceed: false, reason: 'Pay-per-use billing is not active' }
    }
    
    console.log('[checkUsageLimit] Pay-per-use user validated successfully')
    return { canProceed: true }
  }

  // Handle signed-in users without subscription (free tier) - use cookie-based limit
  if (user.subscription_tier === 'free' || !user.subscription_tier) {
    console.log('[checkUsageLimit] Processing signed-in free user with cookie-based limit')
    
    // Import the anonymous usage functions to reuse the cookie logic
    const { canAnonymousUserQuery } = await import('@/lib/anonymous-usage')
    const cookieResult = await canAnonymousUserQuery()
    
    if (!cookieResult.canProceed) {
      // Return a specific reason for signed-in users who hit the limit
      return { 
        canProceed: false, 
        reason: 'Signed-in users get 2 free analyses per day. Upgrade to pay-per-use for unlimited access.' 
      }
    }
    
    return { canProceed: true }
  }

  console.log('[checkUsageLimit] No matching subscription tier found, falling back to error')
  console.log('[checkUsageLimit] Available tiers: subscription, pay_per_use, free')
  return { canProceed: false, reason: `No active subscription or payment method (tier: ${user.subscription_tier})` }
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