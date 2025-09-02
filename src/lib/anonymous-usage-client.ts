const ANONYMOUS_USAGE_COOKIE = 'polyseer_anonymous_usage'
const MAX_ANONYMOUS_QUERIES = 2

interface AnonymousUsage {
  lastQuery: string // ISO date string
  count: number
}

// Client-side utilities for checking usage
export function getClientAnonymousUsage(): AnonymousUsage {
  if (typeof document === 'undefined') {
    return { lastQuery: '', count: 0 }
  }
  
  const cookies = document.cookie.split('; ')
  const usageCookie = cookies.find(cookie => cookie.startsWith(ANONYMOUS_USAGE_COOKIE + '='))
  
  if (!usageCookie) {
    return { lastQuery: '', count: 0 }
  }
  
  try {
    const value = decodeURIComponent(usageCookie.split('=')[1])
    return JSON.parse(value)
  } catch {
    return { lastQuery: '', count: 0 }
  }
}

export function canClientAnonymousUserQuery(): { canProceed: boolean; reason?: string } {
  // In development mode, allow unlimited usage (default to development)
  if (process.env.NEXT_PUBLIC_APP_MODE !== 'production') {
    return { canProceed: true }
  }

  const usage = getClientAnonymousUsage()
  const today = new Date().toISOString().split('T')[0]
  
  if (!usage.lastQuery || usage.lastQuery.split('T')[0] !== today) {
    return { canProceed: true }
  }
  
  if (usage.count >= MAX_ANONYMOUS_QUERIES) {
    return { 
      canProceed: false, 
      reason: 'Anonymous users are limited to 2 free analyses per day. Please sign up for unlimited access.' 
    }
  }
  
  return { canProceed: true }
}