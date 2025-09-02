import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { PolarEventTracker } from '@/lib/polar-events'

export async function POST(request: Request) {
  try {
    const { fromTheme, toTheme, sessionId } = await request.json()
    
    console.log('[Dark Mode API] Received request:', { fromTheme, toTheme, sessionId })

    if (!fromTheme || !toTheme) {
      return NextResponse.json(
        { error: 'Missing fromTheme or toTheme' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('[Dark Mode API] No authenticated user, skipping tracking')
      return NextResponse.json({ 
        message: 'No authenticated user, usage not tracked',
        tracked: false 
      })
    }

    console.log('[Dark Mode API] Authenticated user:', user.id)

    // Fetch user's subscription data
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, polar_customer_id')
      .eq('id', user.id)
      .single()

    if (fetchError || !userData) {
      console.error('[Dark Mode API] Failed to fetch user data:', fetchError)
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      )
    }

    console.log('[Dark Mode API] User data:', {
      tier: userData.subscription_tier,
      status: userData.subscription_status,
      hasCustomerId: !!userData.polar_customer_id
    })

    // Only track usage for pay-per-use customers with Polar customer IDs
    if (userData.subscription_tier !== 'pay_per_use') {
      console.log('[Dark Mode API] User not on pay-per-use plan, skipping tracking')
      return NextResponse.json({
        message: `User on ${userData.subscription_tier} plan, usage not tracked`,
        tracked: false
      })
    }

    if (!userData.polar_customer_id) {
      console.log('[Dark Mode API] No Polar customer ID, skipping tracking')
      return NextResponse.json({
        message: 'No Polar customer ID found, usage not tracked',
        tracked: false
      })
    }

    if (userData.subscription_status !== 'active') {
      console.log('[Dark Mode API] Subscription not active, skipping tracking')
      return NextResponse.json({
        message: 'Subscription not active, usage not tracked',
        tracked: false
      })
    }

    // Track the dark mode switch via Polar
    try {
      const tracker = new PolarEventTracker()
      
      console.log('[Dark Mode API] Tracking dark mode switch via Polar...')
      
      await tracker.trackDarkModeSwitch(
        user.id,
        userData.polar_customer_id,
        sessionId,
        fromTheme,
        toTheme,
        {
          user_tier: userData.subscription_tier,
          subscription_status: userData.subscription_status,
          timestamp: new Date().toISOString()
        }
      )

      console.log('[Dark Mode API] Successfully tracked dark mode switch')

      return NextResponse.json({
        message: 'Dark mode switch tracked successfully',
        tracked: true,
        billing: {
          amount: '$0.01',
          fromTheme,
          toTheme
        }
      })

    } catch (trackingError) {
      console.error('[Dark Mode API] Failed to track via Polar:', trackingError)
      
      return NextResponse.json({
        message: 'Usage tracking failed but theme change allowed',
        tracked: false,
        error: 'Billing service unavailable'
      })
    }

  } catch (error) {
    console.error('[Dark Mode API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}