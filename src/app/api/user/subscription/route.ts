import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ 
        subscription_tier: 'free',
        subscription_status: 'inactive' 
      })
    }
    
    // Fetch user data from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, analyses_remaining, polar_customer_id')
      .eq('id', session.user.id)
      .single()
    
    if (error) {
      console.error('[API] Error fetching user data:', error)
      // Return default values if user doesn't exist yet
      return NextResponse.json({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        analyses_remaining: 0
      })
    }
    
    return NextResponse.json(userData || {
      subscription_tier: 'free',
      subscription_status: 'inactive',
      analyses_remaining: 0
    })
    
  } catch (error) {
    console.error('[API] Exception:', error)
    return NextResponse.json({ 
      subscription_tier: 'free',
      subscription_status: 'inactive' 
    })
  }
}