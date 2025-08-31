import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      return NextResponse.json({ 
        error: 'Session error', 
        details: sessionError 
      }, { status: 401 })
    }
    
    if (!session) {
      return NextResponse.json({ 
        error: 'No session' 
      }, { status: 401 })
    }
    
    console.log('[Test API] User ID:', session.user.id)
    console.log('[Test API] User email:', session.user.email)
    
    // Try to query the users table
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    if (queryError) {
      console.error('[Test API] Query error:', queryError)
      return NextResponse.json({ 
        error: 'Query failed', 
        details: queryError,
        userId: session.user.id 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true,
      userData,
      sessionUserId: session.user.id
    })
    
  } catch (error) {
    console.error('[Test API] Exception:', error)
    return NextResponse.json({ 
      error: 'Exception', 
      details: error 
    }, { status: 500 })
  }
}