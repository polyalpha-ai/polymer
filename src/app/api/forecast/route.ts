import { NextRequest, NextResponse } from 'next/server';
import { runPolymarketForecastPipeline, runUnifiedForecastPipeline } from '@/lib/agents/orchestrator';
import { createClient } from '@/utils/supabase/server';
import { checkUsageLimit, decrementAnalysisCount, setAnalysisContext, clearAnalysisContext } from '@/lib/usage-tracking';
import { createAnalysisSession, completeAnalysisSession, failAnalysisSession } from '@/lib/analysis-session';
import { setLLMContext, clearLLMContext } from '@/lib/polar-llm-strategy';
import { canAnonymousUserQuery, incrementAnonymousUsage } from '@/lib/anonymous-usage';
import { parseMarketUrl, isValidMarketUrl } from '@/lib/tools/market-url-parser';

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
      console.log('[Forecast API] Authenticated user ID:', user.id)
      console.log('[Forecast API] User email:', user.email)
      
      // Get user data including subscription info
      const { data: fetchedUserData, error: fetchError } = await supabase
        .from('users')
        .select('polar_customer_id, subscription_tier, subscription_status, analyses_remaining')
        .eq('id', user.id)
        .single();
      
      console.log('[Forecast API] Database query result:', fetchedUserData)
      console.log('[Forecast API] Database query error:', fetchError)

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
      polymarketSlug, // Legacy support
      marketUrl, // New unified support
      drivers = [],
      historyInterval = '1d',
      withBooks = true,
      withTrades = false
    } = body;

    // Determine which parameter was provided and validate
    let finalMarketUrl: string;
    let identifier: string;

    if (marketUrl) {
      // New unified approach - supports both Polymarket and Kalshi URLs
      if (typeof marketUrl !== 'string' || !marketUrl) {
        return NextResponse.json(
          { error: 'marketUrl must be a non-empty string' },
          { status: 400 }
        );
      }

      if (!isValidMarketUrl(marketUrl)) {
        const parsed = parseMarketUrl(marketUrl);
        return NextResponse.json(
          { error: parsed.error || 'Invalid market URL. Only Polymarket and Kalshi URLs are supported.' },
          { status: 400 }
        );
      }

      finalMarketUrl = marketUrl;
      const parsed = parseMarketUrl(marketUrl);
      identifier = parsed.identifier;
    } else if (polymarketSlug) {
      // Legacy support - convert Polymarket slug to URL
      if (typeof polymarketSlug !== 'string' || !polymarketSlug) {
        return NextResponse.json(
          { error: 'polymarketSlug must be a non-empty string' },
          { status: 400 }
        );
      }

      finalMarketUrl = `https://polymarket.com/event/${polymarketSlug}`;
      identifier = polymarketSlug;
    } else {
      return NextResponse.json(
        { error: 'Either marketUrl or polymarketSlug is required' },
        { status: 400 }
      );
    }

    // Create analysis session (skip for anonymous users)
    let session: any = null;
    if (!isAnonymous && user) {
      session = await createAnalysisSession(user.id, identifier);
      sessionId = session.id;
      
      // Handle usage tracking based on user type
      if (userData.subscription_tier === 'pay_per_use' && userData.polar_customer_id) {
        // Set context for immediate usage tracking (for pay-per-use customers)
        setAnalysisContext(user.id, userData.polar_customer_id); // For Valyu API tracking
        setLLMContext(user.id, userData.polar_customer_id); // For LLM token tracking
        console.log(`[Forecast] Set tracking context for pay-per-use customer: ${userData.polar_customer_id}`);
      } else if (userData.subscription_tier === 'free' || !userData.subscription_tier) {
        // For signed-in free users, increment cookie usage like anonymous users
        await incrementAnonymousUsage();
        console.log(`[Forecast] Signed-in free user used cookie-based daily query`);
      }
      // Subscription users don't need upfront usage tracking
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

          // Decrement analysis count for subscription users only
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

          // Run unified forecasting pipeline with progress tracking (auto-detects platform)
          const forecastCard = await runUnifiedForecastPipeline({
            marketUrl: finalMarketUrl,
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
    message: 'Unified Multi-Platform Forecasting API',
    description: 'AI-powered forecasting using GPT-5 agents - works with Polymarket and Kalshi',
    usage: 'POST with { marketUrl: string, drivers?: string[], historyInterval?: string, withBooks?: boolean, withTrades?: boolean }',
    parameters: {
      marketUrl: 'Required. Full market URL (Polymarket or Kalshi). Platform is auto-detected.',
      polymarketSlug: 'Deprecated. Use marketUrl instead. Still supported for backward compatibility.',
      drivers: 'Optional. Key factors to focus analysis on. Auto-generated if not provided.',
      historyInterval: 'Optional. Price history granularity ("1h", "4h", "1d", "1w"). Auto-optimized if not provided.',
      withBooks: 'Optional. Include order book data (default: true)',
      withTrades: 'Optional. Include recent trades (default: false)'
    },
    supportedPlatforms: {
      polymarket: {
        name: 'Polymarket',
        urlFormat: 'https://polymarket.com/event/{slug}',
        example: 'https://polymarket.com/event/will-trump-win-2024'
      },
      kalshi: {
        name: 'Kalshi',
        urlFormat: 'https://kalshi.com/markets/{series}/{category}/{ticker}',
        example: 'https://kalshi.com/markets/kxtime/times-person-of-the-year/KXTIME-25'
      }
    },
    autoGeneration: {
      drivers: 'System automatically analyzes the market question and generates relevant drivers using GPT-5',
      historyInterval: 'System selects optimal interval based on market volume, time until close, and volatility'
    },
    examples: {
      polymarket: {
        marketUrl: 'https://polymarket.com/event/will-ai-achieve-agi-by-2030'
      },
      kalshi: {
        marketUrl: 'https://kalshi.com/markets/kxgovshut/government-shutdown/kxgovshut-25oct01'
      },
      withCustomization: {
        marketUrl: 'https://polymarket.com/event/will-trump-win-2024',
        drivers: ['Polling data', 'Economic indicators', 'Swing states'],
        historyInterval: '4h'
      }
    }
  });
}