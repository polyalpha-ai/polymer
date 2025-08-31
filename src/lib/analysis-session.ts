import { createClient } from '@/utils/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export interface AnalysisSession {
  id: string
  userId: string
  marketUrl: string
  marketQuestion?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  analysisSteps?: any
  markdownReport?: string
  forecastCard?: any
  currentStep?: string
  progressEvents?: any[]
  durationSeconds?: number
  p0?: number
  pNeutral?: number
  pAware?: number
  drivers?: any
}

export async function createAnalysisSession(
  userId: string,
  marketUrl: string
): Promise<AnalysisSession> {
  const supabase = await createClient()
  const sessionId = uuidv4()
  
  const session: AnalysisSession = {
    id: sessionId,
    userId,
    marketUrl,
    status: 'pending',
    startedAt: new Date(),
  }

  const { error } = await supabase
    .from('analysis_sessions')
    .insert({
      id: sessionId,
      user_id: userId,
      polymarket_slug: marketUrl,
      status: 'pending',
      started_at: session.startedAt.toISOString(),
    })

  if (error) {
    console.error('Failed to create analysis session:', error)
    throw new Error('Failed to create analysis session')
  }

  return session
}

export async function updateAnalysisSession(
  sessionId: string,
  updates: Partial<AnalysisSession>
) {
  const supabase = await createClient()
  
  const dbUpdates: any = {}
  
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status
  }
  
  if (updates.completedAt !== undefined) {
    dbUpdates.completed_at = updates.completedAt.toISOString()
  }
  
  if (updates.analysisSteps !== undefined) {
    dbUpdates.analysis_steps = updates.analysisSteps
  }
  
  if (updates.markdownReport !== undefined) {
    dbUpdates.markdown_report = updates.markdownReport
  }
  
  if (updates.forecastCard !== undefined) {
    dbUpdates.forecast_card = updates.forecastCard
  }
  
  if (updates.currentStep !== undefined) {
    dbUpdates.current_step = updates.currentStep
  }
  
  if (updates.progressEvents !== undefined) {
    dbUpdates.progress_events = updates.progressEvents
  }
  
  if (updates.durationSeconds !== undefined) {
    dbUpdates.duration_seconds = updates.durationSeconds
  }
  
  if (updates.p0 !== undefined) {
    dbUpdates.p0 = updates.p0
  }
  
  if (updates.pNeutral !== undefined) {
    dbUpdates.p_neutral = updates.pNeutral
  }
  
  if (updates.pAware !== undefined) {
    dbUpdates.p_aware = updates.pAware
  }
  
  if (updates.drivers !== undefined) {
    dbUpdates.drivers = updates.drivers
  }
  
  if (updates.marketQuestion !== undefined) {
    dbUpdates.market_question = updates.marketQuestion
  }

  const { error } = await supabase
    .from('analysis_sessions')
    .update(dbUpdates)
    .eq('id', sessionId)

  if (error) {
    console.error('Failed to update analysis session:', error)
    throw new Error('Failed to update analysis session')
  }
}

export async function completeAnalysisSession(
  sessionId: string,
  markdownReport: string,
  analysisSteps: any,
  forecastCard?: any
) {
  await updateAnalysisSession(sessionId, {
    status: 'completed',
    completedAt: new Date(),
    markdownReport,
    analysisSteps,
    forecastCard,
  })
}

export async function failAnalysisSession(
  sessionId: string,
  error: string
) {
  const supabase = await createClient()
  
  await supabase
    .from('analysis_sessions')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
}

export async function getAnalysisHistory(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('analysis_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch analysis history:', error)
    throw new Error('Failed to fetch analysis history')
  }

  return data
}

export async function getAnalysisById(analysisId: string, userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('analysis_sessions')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Failed to fetch analysis:', error)
    throw new Error('Failed to fetch analysis')
  }

  return data
}