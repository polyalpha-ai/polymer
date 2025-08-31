import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const POLAR_API_URL = 'https://api.polar.sh/v1'
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('polar_customer_id')
      .eq('id', user.id)
      .single()

    if (!userData?.polar_customer_id) {
      return NextResponse.json({ error: 'No customer ID found' }, { status: 404 })
    }

    const response = await fetch(`${POLAR_API_URL}/customer-portal-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: userData.polar_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Polar portal error:', error)
      throw new Error('Failed to create portal session')
    }

    const session = await response.json()
    return NextResponse.json({ url: session.customer_portal_url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}