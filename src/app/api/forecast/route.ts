import { NextRequest, NextResponse } from 'next/server';
import { runPolymarketForecastPipeline } from '@/lib/agents/orchestrator';

export const maxDuration = 800;

export async function POST(req: NextRequest) {
  try {
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

        try {
          // Send initial connection event
          sendEvent({ type: 'connected', message: 'Starting analysis...' });

          // Create progress callback for the orchestrator
          const onProgress = (step: string, details: any) => {
            sendEvent({
              type: 'progress',
              step,
              details,
              timestamp: new Date().toISOString()
            }, 'progress');
          };

          // Run Polymarket-specific forecasting pipeline with progress tracking
          const forecastCard = await runPolymarketForecastPipeline({
            polymarketSlug,
            drivers,
            historyInterval,
            withBooks,
            withTrades,
            onProgress
          });

          // Send final result
          sendEvent({
            type: 'complete',
            forecast: forecastCard,
            timestamp: new Date().toISOString()
          }, 'complete');

        } catch (error) {
          console.error('Error in forecast API:', error);
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          
          sendEvent({
            type: 'error',
            error: errorMessage,
            details: error instanceof Error ? error.stack : 'No stack trace available',
            timestamp: new Date().toISOString()
          }, 'error');
        } finally {
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