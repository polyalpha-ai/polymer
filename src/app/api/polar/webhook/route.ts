import { headers } from 'next/headers'
import { createServiceClient } from '@/utils/supabase/server'
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks'

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const headersList = await headers()

    // Convert Next.js headers to plain object that Polar SDK expects
    const headersObj: Record<string, string> = {}
    headersList.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value
    })

    console.log('[Webhook] Headers received:', Object.keys(headersObj))

    // Validate webhook signature
    let event: any
    try {
      event = validateEvent(body, headersObj, process.env.POLAR_WEBHOOK_SECRET!)
      console.log('[Webhook] Signature validated successfully')
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        console.error('[Webhook] Invalid signature:', error.message)
        console.error('[Webhook] Available headers:', Object.keys(headersObj))
        return new Response('Invalid signature', { status: 403 })
      }
      console.error('[Webhook] Validation error:', error)
      return new Response('Webhook validation failed', { status: 400 })
    }

    console.log('[Webhook] Received event:', event.type)
    const supabase = createServiceClient()

    switch (event.type) {
      case 'subscription.created':
      case 'subscription.updated': {
        const subscription = event.data
        const userId = subscription.metadata?.userId || subscription.metadata?.user_id || subscription.customer?.external_id

        if (!userId) {
          console.error('No userId found in subscription:', {
            metadata: subscription.metadata,
            customer: subscription.customer
          })
          return new Response('Invalid metadata', { status: 400 })
        }

        // Extract customer_id from nested customer object
        const customerId = subscription.customer?.id || subscription.customer_id
        
        // Determine tier based on product_id
        const tier = subscription.metadata?.plan === 'subscription' ? 'subscription' : 'pay_per_use'

        console.log('[Webhook] Processing subscription for user:', userId)
        console.log('[Webhook] Subscription data:', {
          customer_id: customerId,
          status: subscription.status,
          id: subscription.id,
          product_id: subscription.product_id,
          plan: subscription.metadata?.plan
        })

        const { data, error } = await supabase
          .from('users')
          .update({
            polar_customer_id: customerId,
            subscription_tier: tier,
            subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
            analyses_remaining: tier === 'subscription' && subscription.status === 'active' ? 20 : 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()

        if (error) {
          console.error('[Webhook] Failed to update user:', error)
          return new Response('Database update failed', { status: 500 })
        }

        console.log('[Webhook] Updated user:', data)
        break
      }

      case 'subscription.canceled': {
        const subscription = event.data
        const userId = subscription.metadata?.userId || subscription.metadata?.user_id || subscription.customer?.external_id

        if (!userId) {
          console.error('No userId found in subscription:', {
            metadata: subscription.metadata,
            customer: subscription.customer
          })
          return new Response('Invalid metadata', { status: 400 })
        }

        console.log('[Webhook] Canceling subscription for user:', userId)

        const { data, error } = await supabase
          .from('users')
          .update({
            subscription_tier: 'free',
            subscription_status: 'inactive',
            analyses_remaining: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()

        if (error) {
          console.error('[Webhook] Failed to cancel subscription:', error)
          return new Response('Database update failed', { status: 500 })
        }

        console.log('[Webhook] Canceled subscription for user:', data)
        break
      }

      case 'checkout.created': {
        const checkout = event.data
        const userId = checkout.metadata?.userId || checkout.metadata?.user_id || checkout.customer?.external_id

        if (!userId) {
          console.error('No userId found in checkout:', {
            metadata: checkout.metadata,
            customer: checkout.customer
          })
          return new Response('Invalid metadata', { status: 400 })
        }

        // Extract customer_id from nested customer object or direct field
        const customerId = checkout.customer?.id || checkout.customer_id

        console.log('[Webhook] Processing checkout for user:', userId)
        console.log('[Webhook] Checkout data:', {
          product_id: checkout.product_id,
          customer_id: customerId,
          products: checkout.products,
          metadata: checkout.metadata
        })

        // Note: We typically handle subscription updates via subscription.created/updated events
        // This is just for logging and potential future use
        console.log('[Webhook] Checkout created, waiting for subscription events')

        break
      }

      default:
        console.log('Unhandled webhook event type:', event.type)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}