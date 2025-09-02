import { cookies } from 'next/headers'

const ANONYMOUS_USAGE_COOKIE = 'polyseer_anonymous_usage'
const MAX_ANONYMOUS_QUERIES = 2

interface AnonymousUsage {
  lastQuery: string // ISO date string
  count: number
}

export async function getAnonymousUsage(): Promise<AnonymousUsage> {
  const cookieStore = await cookies()
  const usageCookie = cookieStore.get(ANONYMOUS_USAGE_COOKIE)
  
  if (!usageCookie) {
    return { lastQuery: '', count: 0 }
  }
  
  try {
    return JSON.parse(usageCookie.value)
  } catch {
    return { lastQuery: '', count: 0 }
  }
}

export async function canAnonymousUserQuery(): Promise<{ canProceed: boolean; reason?: string }> {
  // In development mode, allow unlimited usage (default to development)
  if (process.env.NEXT_PUBLIC_APP_MODE !== 'production') {
    return { canProceed: true }
  }

  const usage = await getAnonymousUsage()
  const today = new Date().toISOString().split('T')[0] // Get YYYY-MM-DD
  
  // If no previous queries or last query was on a different day, allow query
  if (!usage.lastQuery || usage.lastQuery.split('T')[0] !== today) {
    return { canProceed: true }
  }
  
  // If already queried today, check if under limit
  if (usage.count >= MAX_ANONYMOUS_QUERIES) {
    return { 
      canProceed: false, 
      reason: 'Anonymous users are limited to 2 free analyses per day. Please sign up for unlimited access.' 
    }
  }
  
  return { canProceed: true }
}

export async function incrementAnonymousUsage(): Promise<void> {
  const cookieStore = await cookies()
  const usage = await getAnonymousUsage()
  const now = new Date().toISOString()
  const today = now.split('T')[0]
  
  let newUsage: AnonymousUsage
  
  // If first query of the day, reset count
  if (!usage.lastQuery || usage.lastQuery.split('T')[0] !== today) {
    newUsage = { lastQuery: now, count: 1 }
  } else {
    newUsage = { lastQuery: now, count: usage.count + 1 }
  }
  
  // Set cookie to expire at end of day
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  
  cookieStore.set(ANONYMOUS_USAGE_COOKIE, JSON.stringify(newUsage), {
    expires: tomorrow,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })
}

