import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { Polar } from '@polar-sh/sdk'

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json()
    
    // Validate plan
    if (!['pay_per_use', 'subscription'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize Polar
    const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN! })

    // Map plan to product ID
    const productId = plan === 'subscription' 
      ? process.env.POLAR_SUBSCRIPTION_PRODUCT_ID
      : process.env.POLAR_PAY_PER_USE_PRODUCT_ID

    if (!productId) {
      console.error(`[Checkout] Missing product ID for plan: ${plan}`)
      return NextResponse.json({ error: 'Product not configured' }, { status: 500 })
    }

    // Create checkout using External ID pattern
    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email!,
      externalCustomerId: user.id,  // Use Supabase user ID as external ID
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/?checkout=success` || 'http://localhost:3000/?checkout=success',
      metadata: { plan, userId: user.id }
    })

    console.log(`[Checkout] Created checkout for ${plan} plan, user: ${user.email}`)
    
    return NextResponse.json({ 
      checkoutUrl: checkout.url,
      plan 
    })

  } catch (error) {
    console.error('[Checkout] Error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}