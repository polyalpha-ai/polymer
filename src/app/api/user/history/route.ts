import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAnalysisHistory } from '@/lib/analysis-session'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const history = await getAnalysisHistory(user.id)
    
    return NextResponse.json(history)
  } catch (error) {
    console.error('Failed to fetch history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analysis history' },
      { status: 500 }
    )
  }
}