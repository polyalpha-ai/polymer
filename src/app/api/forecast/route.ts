import { NextRequest, NextResponse } from 'next/server';
import { runPolymarketForecastPipeline } from '@/lib/agents/orchestrator';
import { createClient } from '@/utils/supabase/server';
import { checkUsageLimit, decrementAnalysisCount, setAnalysisContext, clearAnalysisContext } from '@/lib/usage-tracking';
import { createAnalysisSession, completeAnalysisSession, failAnalysisSession } from '@/lib/analysis-session';
import { setLLMContext, clearLLMContext } from '@/lib/polar-llm-strategy';
import { canAnonymousUserQuery, incrementAnonymousUsage } from '@/lib/anonymous-usage';

export const maxDuration = 800;

export async function POST(req: NextRequest) {
  let sessionId: string | null = null;
  
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userData: any = null;
    let isAnonymous = false;

    if (!user) {
      // Handle anonymous user
      isAnonymous = true;
      
      // Check anonymous usage limits
      const { canProceed, reason } = await canAnonymousUserQuery();
      if (!canProceed) {
        return NextResponse.json(
          { error: reason || 'Daily limit exceeded for anonymous users' },
          { status: 403 }
        );
      }
    } else {
      // Handle authenticated user
      // Get user data including subscription info
      const { data: fetchedUserData } = await supabase
        .from('users')
        .select('polar_customer_id, subscription_tier, subscription_status, analyses_remaining')
        .eq('id', user.id)
        .single();

      if (!fetchedUserData) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        );
      }

      userData = fetchedUserData;

      // Check usage limits for authenticated users
      const { canProceed, reason } = await checkUsageLimit(user.id);
      if (!canProceed) {
        return NextResponse.json(
          { error: reason || 'Usage limit exceeded' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { 
      polymarketSlug,
      drivers = [],
      historyInterval = '1d',
      withBooks = true,
      withTrades = false
    } = body;

    // Validate required polymarketSlug
    if (!polymarketSlug || typeof polymarketSlug !== 'string') {
      return NextResponse.json(
        { error: 'polymarketSlug is required and must be a string' },
        { status: 400 }
      );
    }

    // Create analysis session (skip for anonymous users)
    let session: any = null;
    if (!isAnonymous && user) {
      session = await createAnalysisSession(user.id, polymarketSlug);
      sessionId = session.id;
      
      // Set context for immediate usage tracking (for pay-per-use customers)
      if (userData.subscription_tier === 'pay_per_use' && userData.polar_customer_id) {
        setAnalysisContext(user.id, userData.polar_customer_id); // For Valyu API tracking
        setLLMContext(user.id, userData.polar_customer_id); // For LLM token tracking
        console.log(`[Forecast] Set tracking context for pay-per-use customer: ${userData.polar_customer_id}`);
      }
    } else {
      // For anonymous users, increment usage count immediately
      await incrementAnonymousUsage();
      console.log(`[Forecast] Anonymous user used daily query`);
    }

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Helper function to send SSE event
        const sendEvent = (data: any, event?: string) => {
          const eventData = event ? `event: ${event}\n` : '';
          const payload = `${eventData}data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        };

        // Track all analysis steps for storage
        const analysisSteps: any[] = [];

        try {
          // Send initial connection event
          sendEvent({ type: 'connected', message: 'Starting analysis...', sessionId });

          // Decrement analysis count for subscription users (skip for anonymous)
          if (!isAnonymous && user && userData.subscription_tier === 'subscription') {
            await decrementAnalysisCount(user.id);
          }

          // Create progress callback for the orchestrator
          const onProgress = (step: string, details: any) => {
            // Store step for history
            analysisSteps.push({
              step,
              details,
              timestamp: new Date().toISOString()
            });

            sendEvent({
              type: 'progress',
              step,
              details,
              timestamp: new Date().toISOString()
            }, 'progress');
          };

          // Note: LLM token tracking is handled automatically by Polar LLMStrategy
          // when models are wrapped with the strategy in the agent code

          // Run Polymarket-specific forecasting pipeline with progress tracking
          const forecastCard = await runPolymarketForecastPipeline({
            polymarketSlug,
            drivers,
            historyInterval,
            withBooks,
            withTrades,
            onProgress,
            sessionId: sessionId || undefined,
            customerId: !isAnonymous && userData.subscription_tier === 'pay_per_use' ? userData.polar_customer_id : undefined
          });

          // Valyu usage is tracked immediately as calls are made

          // Complete the analysis session
          if (sessionId) {
            await completeAnalysisSession(
              sessionId,
              JSON.stringify(forecastCard), // Convert to markdown report
              analysisSteps,
              forecastCard
            );
          }

          // Send final result
          sendEvent({
            type: 'complete',
            forecast: forecastCard,
            sessionId,
            timestamp: new Date().toISOString()
          }, 'complete');

        } catch (error) {
          console.error('Error in forecast API:', error);
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          
          // Mark session as failed
          if (sessionId) {
            await failAnalysisSession(sessionId, errorMessage);
          }
          
          sendEvent({
            type: 'error',
            error: errorMessage,
            details: error instanceof Error ? error.stack : 'No stack trace available',
            sessionId,
            timestamp: new Date().toISOString()
          }, 'error');
        } finally {
          // Clear tracking contexts
          clearAnalysisContext();
          clearLLMContext();
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('Error setting up forecast stream:', error);
    
    // Mark session as failed if it was created
    if (sessionId) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await failAnalysisSession(sessionId, errorMessage);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Polymarket Multi-Agent Forecasting API',
    description: 'AI-powered forecasting using GPT-5 agents with Polymarket integration',
    usage: 'POST with { polymarketSlug: string, drivers?: string[], historyInterval?: string, withBooks?: boolean, withTrades?: boolean }',
    parameters: {
      polymarketSlug: 'Required. Polymarket slug (e.g., "will-trump-win-2024")',
      drivers: 'Optional. Key factors to focus analysis on. Auto-generated if not provided.',
      historyInterval: 'Optional. Price history granularity ("1h", "4h", "1d", "1w"). Auto-optimized if not provided.',
      withBooks: 'Optional. Include order book data (default: true)',
      withTrades: 'Optional. Include recent trades (default: false)'
    },
    autoGeneration: {
      drivers: 'System automatically analyzes the market question and generates relevant drivers using GPT-5',
      historyInterval: 'System selects optimal interval based on market volume, time until close, and volatility'
    },
    examples: {
      minimal: {
        polymarketSlug: 'will-ai-achieve-agi-by-2030'
      },
      withCustomization: {
        polymarketSlug: 'will-trump-win-2024',
        drivers: ['Polling data', 'Economic indicators', 'Swing states'],
        historyInterval: '4h'
      }
    }
  });
}