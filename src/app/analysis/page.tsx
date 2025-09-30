"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Image from "next/image";
import { ForecastCard } from "@/lib/forecasting/types";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { canClientAnonymousUserQuery } from "@/lib/anonymous-usage-client";
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

interface ProgressEvent {
  type: 'connected' | 'progress' | 'complete' | 'error';
  step?: string;
  message?: string;
  details?: any;
  forecast?: ForecastCard;
  error?: string;
  timestamp?: string;
}

interface AnalysisStep {
  id: string;
  name: string;
  message: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  details?: any;
  timestamp?: string;
  expanded?: boolean;
}

const STEP_CONFIG: Record<string, { name: string; description: string }> = {
  fetch_initial: { name: 'Data Collection', description: 'Fetching market data' },
  initial_data: { name: 'Market Analysis', description: 'Analyzing market fundamentals' },
  optimize_parameters: { name: 'Parameter Optimization', description: 'Optimizing analysis parameters' },
  parameters_optimized: { name: 'Configuration Complete', description: 'Analysis configuration optimized' },
  fetch_complete_data: { name: 'Enhanced Data Fetch', description: 'Retrieving complete dataset' },
  complete_data_ready: { name: 'Data Processing', description: 'Processing complete market dataset' },
  planning: { name: 'Research Planning', description: 'Planning research strategy' },
  plan_complete: { name: 'Strategy Complete', description: 'Research strategy finalized' },
  researching: { name: 'Initial Research', description: 'Starting initial evidence research' },
  initial_research_complete: { name: 'Research Cycle 1', description: 'Initial evidence collection finished' },
  criticism: { name: 'Critical Analysis', description: 'Running critical analysis to identify gaps' },
  criticism_complete: { name: 'Gap Analysis', description: 'Critical analysis and gap identification complete' },
  followup_research: { name: 'Follow-up Research', description: 'Conducting targeted follow-up research' },
  followup_research_complete: { name: 'Research Cycle 2', description: 'Follow-up research completed' },
  followup_research_skipped: { name: 'Follow-up Skipped', description: 'Follow-up research skipped - no gaps identified' },
  aggregating: { name: 'Enhanced Analysis', description: 'Aggregating evidence with critic feedback' },
  aggregation_complete: { name: 'Probability Complete', description: 'Enhanced probability aggregation finished' },
  reporting: { name: 'Report Generation', description: 'Generating final report' },
  report_complete: { name: 'Analysis Finished', description: 'Final report generated' }
};

function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const url = searchParams.get("url");
  const historyId = searchParams.get("id"); // New: Check for historical analysis ID
  const [mounted, setMounted] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [forecast, setForecast] = useState<ForecastCard | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalAnalysis, setHistoricalAnalysis] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Determine if this is a historical view
  const isHistoricalView = !!historyId;

  const extractIdentifier = useCallback((url: string) => {
    // Try Polymarket first
    const polymarketMatch = url.match(/polymarket\.com\/event\/([^/?]+)/);
    if (polymarketMatch) return polymarketMatch[1];

    // Try Kalshi full path (with ticker)
    const kalshiFullMatch = url.match(/kalshi\.com\/markets\/[^/]+\/[^/]+\/([A-Z0-9-]+)/i);
    if (kalshiFullMatch) return kalshiFullMatch[1];

    // Try Kalshi series path
    const kalshiSeriesMatch = url.match(/kalshi\.com\/markets\/([a-z0-9-]+)/i);
    if (kalshiSeriesMatch) return kalshiSeriesMatch[1];

    return null;
  }, []);

  const detectPlatform = useCallback((url: string) => {
    if (url.includes('polymarket.com')) return 'Polymarket';
    if (url.includes('kalshi.com')) return 'Kalshi';
    return 'Unknown';
  }, []);

  const formatSlugTitle = useCallback((slug?: string | null) => {
    if (!slug) return '';
    return slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }, []);

  const toggleStepExpanded = useCallback((stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, expanded: !step.expanded } : step
    ));
  }, []);

  const fetchHistoricalAnalysis = useCallback(async () => {
    if (!historyId || !user) return;

    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/user/history/${historyId}`);
      if (response.ok) {
        const data = await response.json();
        setHistoricalAnalysis(data);
        
        // Convert historical data to the display format
        if (data.report) {
          const historicalForecast: ForecastCard = {
            question: data.report.market_question || 'Historical Analysis',
            pNeutral: data.report.probability || 0.5,
            pAware: data.report.market_aware_probability,
            p0: data.report.prior_probability || 0.5,
            alpha: 1.0, // Default alpha value
            drivers: data.report.drivers || [],
            evidenceInfluence: [], // Use correct property name
            clusters: [],
            audit: {}, // Required audit object
            provenance: data.report.sources || [],
            markdownReport: data.report.markdown_report || data.report.summary || ''
          };
          setForecast(historicalForecast);
        }

        // Convert historical steps to display format if available
        if (data.analysis_steps && Array.isArray(data.analysis_steps)) {
          const historicalSteps: AnalysisStep[] = data.analysis_steps.map((step: any, index: number) => ({
            id: step.step || `step_${index}`,
            name: STEP_CONFIG[step.step]?.name || step.step || `Step ${index + 1}`,
            message: step.message || STEP_CONFIG[step.step]?.description || 'Processing...',
            status: 'complete' as const,
            details: step.details,
            timestamp: step.timestamp,
            expanded: false
          }));
          setSteps(historicalSteps);
        }

        setIsComplete(true);
      } else {
        setError('Failed to load historical analysis');
      }
    } catch (err) {
      console.error('Error fetching historical analysis:', err);
      setError('Failed to load historical analysis');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [historyId, user]);

  const startAnalysis = useCallback(() => {
    if (!url) return;

    const identifier = extractIdentifier(url);
    const platform = detectPlatform(url);

    if (!identifier) {
      setError(`Invalid ${platform} URL`);
      return;
    }

    // Track URL entered event
    if (typeof window !== 'undefined') {
      import('@vercel/analytics').then(({ track }) => {
        track('Analysis Started', {
          url: url,
          identifier: identifier,
          platform: platform,
          userType: user ? 'authenticated' : 'anonymous',
          tier: user?.subscription_tier || 'anonymous'
        });
      });
    }

    // Check anonymous usage limits if user is not authenticated
    if (!user) {
      const { canProceed, reason } = canClientAnonymousUserQuery();
      if (!canProceed) {
        setError(reason || 'Daily limit exceeded for anonymous users');
        return;
      }
    }

    fetch('/api/forecast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        marketUrl: url,
      }),
    })
    .then(async response => {
      if (!response.ok) {
        // Try to get the error message from the response body
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const responseText = await response.text();
          
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.error || errorMessage;
            } catch (jsonError) {
              // If it's not JSON, maybe it's plain text
              errorMessage = responseText || errorMessage;
            }
          }
        } catch (readError) {
          // Keep the default errorMessage
        }
        
        // Check if this is a rate limit error - handle it gracefully without console error
        const isRateLimitError = errorMessage.includes('Daily limit exceeded') || errorMessage.includes('limited to 1 free analysis');
        
        if (isRateLimitError) {
          // Set error state directly without throwing to avoid console error
          setError(errorMessage);
          return; // Exit early, don't throw
        }
        
        throw new Error(errorMessage);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              try {
                const data: ProgressEvent = JSON.parse(line.slice(6));
                handleProgressEvent(data);
              } catch (e) {
                console.error('Error parsing SSE data:', e, line);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    })
    .catch(err => {
      console.error('Analysis failed:', err);
      setError(err.message || 'Analysis failed');
    });
  }, [url, extractIdentifier, detectPlatform, user]);

  const handleProgressEvent = useCallback((event: ProgressEvent) => {
    console.log('Progress event:', event);

    if (event.type === 'error') {
      setError(event.error || 'Unknown error occurred');
      
      // Track analysis errors
      if (typeof window !== 'undefined') {
        import('@vercel/analytics').then(({ track }) => {
          track('Analysis Error', { 
            error: event.error || 'Unknown error',
            url: url,
            userType: user ? 'authenticated' : 'anonymous',
            tier: user?.subscription_tier || 'anonymous'
          });
        });
      }
      return;
    }

    if (event.type === 'complete' && event.forecast) {
      setForecast(event.forecast);
      setIsComplete(true);
      // Mark all steps as complete
      setSteps(prev => prev.map(step => ({ ...step, status: 'complete' as const })));
      
      // Track report completion event
      if (typeof window !== 'undefined' && event.forecast) {
        import('@vercel/analytics').then(({ track }) => {
          track('Report Completed', {
            url: url,
            identifier: extractIdentifier(url || ''),
            platform: detectPlatform(url || ''),
            userType: user ? 'authenticated' : 'anonymous',
            tier: user?.subscription_tier || 'anonymous',
            probability: event.forecast?.pNeutral || 0.5,
            confidence: Math.abs((event.forecast?.pNeutral || 0.5) - 0.5) * 200,
            evidenceCount: event.forecast?.evidenceInfluence?.length || 0
          });
        });
      }
      return;
    }

    if (event.type === 'progress' && event.step) {
      const stepConfig = STEP_CONFIG[event.step];
      if (!stepConfig) return;

      setSteps(prev => {
        const existingIndex = prev.findIndex(s => s.id === event.step);
        
        if (existingIndex >= 0) {
          // Update existing step - if it has response data, mark as complete
          const updated = [...prev];
          const hasResponseData = event.details?.response || event.details?.urls || event.details?.plan;
          updated[existingIndex] = {
            ...updated[existingIndex],
            message: event.details?.message || event.message || stepConfig.description,
            details: event.details,
            timestamp: event.timestamp,
            status: hasResponseData ? 'complete' : 'running'
          };
          return updated;
        } else {
          // Mark previous step as complete when starting a new one
          const updated = prev.map((step, index) => 
            index === prev.length - 1 && step.status === 'running' 
              ? { ...step, status: 'complete' as const }
              : step
          );
          
          // Add new step
          const newStep: AnalysisStep = {
            id: event.step!,
            name: stepConfig.name,
            message: event.details?.message || event.message || stepConfig.description,
            status: 'running',
            details: event.details,
            timestamp: event.timestamp,
            expanded: false
          };
          
          return [...updated, newStep];
        }
      });
    }
  }, []);

  const openMarketBet = useCallback(() => {
    const targetUrl = isHistoricalView ? historicalAnalysis?.market_url : url;
    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }
  }, [url, isHistoricalView, historicalAnalysis]);

  const getPlatformFromUrl = useCallback((url?: string | null) => {
    if (!url) return 'Unknown';
    if (url.includes('polymarket.com')) return 'Polymarket';
    if (url.includes('kalshi.com')) return 'Kalshi';
    return 'Unknown';
  }, []);

  useEffect(() => {
    setMounted(true);
    // Note: Removed authentication redirect to allow anonymous users
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isHistoricalView) {
      // Load historical analysis
      if (historyId && user && !isComplete && !isLoadingHistory) {
        fetchHistoricalAnalysis();
      }
    } else {
      // Start live analysis
      if (url && !isComplete && steps.length === 0) {
        startAnalysis();
      }
    }
  }, [mounted, isHistoricalView, historyId, url, user, isComplete, steps.length, isLoadingHistory, startAnalysis, fetchHistoricalAnalysis]);

  if (!mounted) return null;

  // Special loading state for historical analysis
  if (isHistoricalView && isLoadingHistory) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"
          />
          <p className="text-white/70">Loading historical analysis...</p>
        </motion.div>
      </div>
    );
  }

  // Special error handling for historical analysis
  if (isHistoricalView && error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Analysis Not Found</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline">
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  if (error) {
    // Check if this is a rate limit error
    const isAnonymousRateLimit = error.includes('Daily limit exceeded') || error.includes('limited to 2 free analyses');
    const isSignedInRateLimit = error.includes('Signed-in users get 2 free analyses per day');
    const isRateLimitError = isAnonymousRateLimit || isSignedInRateLimit;
    
    if (isRateLimitError) {
      // Track rate limit hit
      if (typeof window !== 'undefined') {
        import('@vercel/analytics').then(({ track }) => {
          track('Rate Limit Hit', { 
            userType: user ? 'authenticated' : 'anonymous',
            tier: user?.subscription_tier || 'anonymous'
          });
        });
      }
      
      return (
        <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
          {/* Video Background */}
          <div className="fixed inset-0 w-full h-full z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/analysis.webm" type="video/webm" />
            </video>
            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
          
          {/* Content overlay */}
          <div className="relative z-50 flex items-center justify-center min-h-screen">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* Show different UI for signed-in vs anonymous users */}
              {isSignedInRateLimit ? (
                /* Signed-in user rate limit UI */
                <>
                  {/* Main Card */}
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 mb-6 max-w-2xl mx-auto">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 font-[family-name:var(--font-space)]">
                      You&apos;ve Used Your Free Analyses
                    </h1>
                    <p className="text-white/80 mb-4">
                      Upgrade to pay-per-use for unlimited access
                    </p>
                  </div>
                  
                  {/* Pay Per Use Focus */}
                  <div className="max-w-md mx-auto mb-6">
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-300/30 rounded-2xl p-6 text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                      </div>
                      <h3 className="text-white font-semibold text-xl mb-2">Pay Per Use</h3>
                      <p className="text-white/80 mb-4">Pay only for what you use</p>
                      <div className="text-white/90 text-2xl font-bold mb-2">~$5 <span className="text-sm font-normal">typical cost</span></div>
                      <p className="text-white/60 text-sm mb-4">Exact cost based on usage</p>
                      <ul className="text-white/80 text-sm space-y-2 mb-6">
                        <li>✓ Pay actual API costs</li>
                        <li>✓ No monthly commitment</li>
                        <li>✓ Transparent pricing</li>
                        <li>✓ Start analyzing immediately</li>
                      </ul>
                      <Button 
                        onClick={() => router.push('/?plan=payperuse')} 
                        size="lg"
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold border-0"
                      >
                        Upgrade to Pay-Per-Use
                      </Button>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 max-w-md mx-auto">
                    <div className="text-center">
                      <p className="text-white/60 text-sm mb-3">
                        Your free analysis resets daily at midnight
                      </p>
                      <Button 
                        onClick={() => router.push('/')} 
                        variant="outline"
                        size="sm"
                        className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-4 py-1"
                      >
                        Back to Home
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* Anonymous user rate limit UI */
                <>
                  {/* Main Card */}
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 mb-6 max-w-2xl mx-auto">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Title */}
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 font-[family-name:var(--font-space)]">
                      Daily Limit Reached
                    </h1>
                    <p className="text-white/80 mb-4">
                      Choose your plan to continue analyzing markets
                    </p>
                  </div>
                  
                  {/* Pricing Plans */}
                  <div className="grid md:grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
                    {/* Pay Per Use */}
                    <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 text-center hover:bg-white/25 transition-all cursor-pointer">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Pay Per Use</h3>
                      <p className="text-white/70 text-sm mb-3">Pay only for what you use</p>
                      <div className="text-white/90 text-xl font-bold mb-1">~$5 <span className="text-sm font-normal">typical cost</span></div>
                      <p className="text-white/60 text-xs mb-3">Exact cost based on usage</p>
                      <ul className="text-white/70 text-sm space-y-1">
                        <li>✓ Pay actual API costs</li>
                        <li>✓ No monthly commitment</li>
                        <li>✓ Transparent pricing</li>
                      </ul>
                    </div>
                    
                    {/* Subscription */}
                    <div className="bg-gradient-to-br from-purple-500/30 to-blue-500/30 backdrop-blur-sm border border-purple-300/50 rounded-2xl p-6 text-center hover:from-purple-500/40 hover:to-blue-500/40 transition-all cursor-pointer relative">
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                        POPULAR
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Unlimited</h3>
                      <p className="text-white/70 text-sm mb-3">Best value for active traders</p>
                      <div className="text-white/90 text-xl font-bold mb-3">$29 <span className="text-sm font-normal">per month</span></div>
                      <ul className="text-white/70 text-sm space-y-1">
                        <li>✓ Unlimited analyses</li>
                        <li>✓ Telegram alerts</li>
                        <li>✓ Event monitoring</li>
                        <li>✓ Priority support</li>
                      </ul>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4 max-w-2xl mx-auto">
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-3">
                      <Button 
                        onClick={() => router.push('/?plan=subscription')} 
                        size="default"
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 font-semibold border-0"
                      >
                        Start Unlimited Plan
                      </Button>
                      <Button 
                        onClick={() => router.push('/?plan=payperuse')} 
                        variant="outline" 
                        size="default"
                        className="border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-6 py-2"
                      >
                        Pay Per Analysis
                      </Button>
                    </div>
                    
                    {/* Reset Info */}
                    <p className="text-white/60 text-xs text-center">
                      Free analysis resets daily at midnight • <button onClick={() => router.push('/')} className="underline hover:text-white">Back to Home</button>
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </div>
          
          {/* Bottom fade overlay */}
          <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none z-40"></div>
        </div>
      );
    }
    
    // Default error state for other errors
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Analysis Failed</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0 w-full h-full z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/analysis.webm" type="video/webm" />
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>
      
      {/* Content overlay */}
      <div className="relative z-50 max-w-4xl mx-auto pt-24">
        
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-space)]">
              {isHistoricalView ? 'Historical Analysis' : ''}
            </h1>
            {isHistoricalView && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push('/')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  New Analysis
                </Button>
              </div>
            )}
          </div>
          
          {isHistoricalView && historicalAnalysis && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-white/60">Started</div>
                  <div className="text-white font-medium">
                    {new Date(historicalAnalysis.started_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Completed</div>
                  <div className="text-white font-medium">
                    {new Date(historicalAnalysis.completed_at).toLocaleString()}
                  </div>
                </div>
                {historicalAnalysis.valyu_cost && (
                  <div>
                    <div className="text-white/60">API Cost</div>
                    <div className="text-white font-medium">
                      ${historicalAnalysis.valyu_cost.toFixed(4)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Anonymous User Banner */}
        {!user && !isHistoricalView && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/90 mb-1">Free Daily Analysis</h3>
                <p className="text-xs text-white/70">
                  You&apos;re using 1 of 1 free analysis per day. Sign up for unlimited access!
                </p>
              </div>
              <Button
                onClick={() => router.push('/')}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1"
              >
                Sign Up
              </Button>
            </div>
          </motion.div>
        )}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 max-w-4xl mx-auto">
            {isHistoricalView ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Historical Analysis
                  </Badge>
                  {historicalAnalysis && (
                    <span className="text-white/60 text-sm">
                      {new Date(historicalAnalysis.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <a
                  href={historicalAnalysis?.market_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/90 hover:text-white text-sm break-all leading-relaxed hover:underline decoration-white/50 transition-colors"
                >
                  {historicalAnalysis?.market_url || 'Loading...'}
                </a>
              </div>
            ) : (
              <a
                href={url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/90 hover:text-white text-sm break-all leading-relaxed hover:underline decoration-white/50 transition-colors"
              >
                {url}
              </a>
            )}
          </div>
        </motion.div>

        {/* Analysis Trail */}
        <div className="relative mb-12">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-purple-500/40 to-green-500/40"></div>
          
          <div className="space-y-8">
            <AnimatePresence>
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: index * 0.08,
                    ease: "easeOut"
                  }}
                  className="relative"
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-6 top-6 z-10">
                    <div className={`
                      w-4 h-4 rounded-full border-2 transition-all duration-300
                      ${step.status === 'complete' 
                        ? 'bg-green-400 border-green-400 shadow-lg shadow-green-400/30' 
                        : step.status === 'running' 
                        ? 'bg-blue-400 border-blue-400 shadow-lg shadow-blue-400/30 animate-pulse' 
                        : step.status === 'error'
                        ? 'bg-red-400 border-red-400 shadow-lg shadow-red-400/30'
                        : 'bg-white/10 border-white/20'
                      }
                    `}></div>
                  </div>
                  
                  {/* Step Card */}
                  <div className="ml-16">
                    <Card className={`
                      relative z-10 backdrop-blur-sm transition-all duration-300 cursor-pointer hover:scale-[1.02] 
                      ${step.status === 'complete' 
                        ? 'bg-green-400/10 border-green-400/30 shadow-lg shadow-green-400/20' 
                        : step.status === 'running' 
                        ? 'bg-blue-400/10 border-blue-400/30 shadow-lg shadow-blue-400/20' 
                        : step.status === 'error'
                        ? 'bg-red-400/10 border-red-400/30 shadow-lg shadow-red-400/20'
                        : 'bg-white/10 border-white/20'
                      }
                    `}>
                      <CardHeader 
                        className="pb-3" 
                        onClick={() => toggleStepExpanded(step.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {step.status === 'complete' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                              >
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              </motion.div>
                            )}
                            {step.status === 'running' && (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <Clock className="w-5 h-5 text-blue-400" />
                              </motion.div>
                            )}
                            {step.status === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                            {step.status === 'pending' && (
                              <div className="w-5 h-5 border-2 border-white/20 rounded-full animate-pulse"></div>
                            )}
                            
                            <div>
                              {(['initial_data','complete_data_ready'].includes(step.id)) ? (
                                <div>
                                  <CardTitle className="text-white text-lg font-semibold">{getPlatformFromUrl(url)} Market</CardTitle>
                                  {url && (
                                    <div className="text-white/80 text-sm mt-1">
                                      <a href={url} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                                        {formatSlugTitle(extractIdentifier(url)) || `View on ${getPlatformFromUrl(url)}`} <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  )}
                                  {step.details?.question && (
                                    <p className="text-white/70 text-sm mt-1 leading-relaxed">{step.details.question}</p>
                                  )}
                                  {step.timestamp && (
                                    <p className="text-white/40 text-xs mt-1">{new Date(step.timestamp).toLocaleTimeString()}</p>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <CardTitle className="text-white text-lg font-semibold">{step.name}</CardTitle>
                                  <p className="text-white/70 text-sm mt-1 leading-relaxed">{step.message}</p>
                                  {step.timestamp && (
                                    <p className="text-white/40 text-xs mt-1">{new Date(step.timestamp).toLocaleTimeString()}</p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0.2, delay: 0.2 }}
                            >
                              <Badge 
                                variant="outline"
                                className={`
                                  px-3 py-1 text-xs font-medium border transition-all duration-200
                                  ${step.status === 'complete' 
                                    ? 'bg-green-400/10 text-green-400 border-green-400/30' 
                                    : step.status === 'running'
                                    ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                                    : step.status === 'error'
                                    ? 'bg-red-400/10 text-red-400 border-red-400/30'
                                    : 'bg-white/5 text-white/60 border-white/20'
                                  }
                                `}
                              >
                                {step.status === 'running' && '●'} {step.status}
                              </Badge>
                            </motion.div>
                            
                            {step.details && Object.keys(step.details).length > 0 && (
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {step.expanded ? 
                                  <ChevronDown className="w-4 h-4 text-white/40" /> : 
                                  <ChevronRight className="w-4 h-4 text-white/40" />
                                }
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <AnimatePresence>
                        {(['initial_data','complete_data_ready'].includes(step.id)) ? (
                          step.details && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                              <CardContent className="pt-0 pb-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white/80 text-sm">
                                  {typeof step.details.outcomes === 'number' && (
                                    <div>
                                      <div className="text-white/60">Outcomes</div>
                                      <div className="font-semibold">{step.details.outcomes}</div>
                                    </div>
                                  )}
                                  {step.details.interval && (
                                    <div>
                                      <div className="text-white/60">Interval</div>
                                      <div className="font-semibold">{step.details.interval}</div>
                                    </div>
                                  )}
                                  {typeof step.details.historySeries === 'number' && (
                                    <div>
                                      <div className="text-white/60">History Series</div>
                                      <div className="font-semibold">{step.details.historySeries}</div>
                                    </div>
                                  )}
                                  {typeof step.details.volume === 'number' && (
                                    <div>
                                      <div className="text-white/60">Volume</div>
                                      <div className="font-semibold">{step.details.volume.toLocaleString()}</div>
                                    </div>
                                  )}
                                  {typeof step.details.liquidity === 'number' && (
                                    <div>
                                      <div className="text-white/60">Liquidity</div>
                                      <div className="font-semibold">{step.details.liquidity.toLocaleString()}</div>
                                    </div>
                                  )}
                                  {step.details.closeTime && (
                                    <div>
                                      <div className="text-white/60">Close Time</div>
                                      <div className="font-semibold">{new Date(step.details.closeTime).toLocaleString()}</div>
                                    </div>
                                  )}
                                  {step.details.resolutionSource && (
                                    <div className="col-span-2">
                                      <div className="text-white/60">Resolution Source</div>
                                      <div className="font-semibold truncate">{step.details.resolutionSource}</div>
                                    </div>
                                  )}
                                </div>

                                {Array.isArray(step.details.pricesNow) && step.details.pricesNow.length > 0 && (
                                  <div className="mt-4">
                                    <div className="text-white/60 text-sm mb-2">Top of Book</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {step.details.pricesNow.map((p:any, idx:number) => (
                                        <div key={idx} className="text-white/80 text-sm flex justify-between bg-white/5 rounded p-2">
                                          <span className="truncate mr-2">{p.outcome || 'Outcome'}</span>
                                          <span className="font-mono">bid {p.bid ?? '-'} | ask {p.ask ?? '-'} | mid {p.mid ?? '-'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {step.details?.eventSummary?.isMultiCandidate && Array.isArray(step.details.eventSummary.topCandidates) && (
                                  <div className="mt-4">
                                    <div className="text-white/60 text-sm mb-2">Top Candidates</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {step.details.eventSummary.topCandidates.map((c:any, idx:number) => (
                                        <div key={idx} className="text-white/80 text-sm bg-white/5 rounded p-2 flex justify-between">
                                          <span className="truncate mr-2">{c.name}</span>
                                          <span className="font-mono">
                                            {c.implied_probability != null ? `${(c.implied_probability*100).toFixed(1)}%` : '-'}
                                            {typeof c.volume === 'number' ? ` | vol $${c.volume.toLocaleString()}` : ''}
                                            {typeof c.liquidity === 'number' ? ` | liq $${c.liquidity.toLocaleString()}` : ''}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {typeof step.details.withBooks !== 'undefined' && (
                                  <div className="mt-4 text-white/80 text-sm">Order Books: <span className="font-semibold">{String(step.details.withBooks)}</span></div>
                                )}
                                {typeof step.details.withTrades !== 'undefined' && (
                                  <div className="text-white/80 text-sm">Recent Trades: <span className="font-semibold">{String(step.details.withTrades)}</span></div>
                                )}
                              </CardContent>
                            </motion.div>
                          )
                        ) : (
                          step.expanded && step.details && Object.keys(step.details).length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                              <CardContent className="pt-0 pb-6">
                                <div className="bg-black/50 rounded-lg p-6 border border-white/10">
                                  <pre className="whitespace-pre-wrap text-white/80 text-xs leading-relaxed font-mono overflow-x-auto max-h-96 overflow-y-auto">
                                    {JSON.stringify(step.details, null, 2)}
                                  </pre>
                                </div>
                              </CardContent>
                            </motion.div>
                          )
                        )}
                      </AnimatePresence>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Final Results */}
        <AnimatePresence>
          {isComplete && forecast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="relative z-10 backdrop-blur-md bg-black/70 border-white/30 shadow-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-2xl text-white mb-2">Analysis Complete</CardTitle>
                  <p className="text-white/80">{forecast.question}</p>
                  {url && (
                    <div className="mt-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-white/80 underline hover:text-white"
                      >
                        View on {getPlatformFromUrl(url)} <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6 min-w-0">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Probability Estimates</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Neutral Analysis:</span>
                          <Badge className="bg-blue-400/20 text-blue-400">
                            {(forecast.pNeutral * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        {forecast.pAware && (
                          <div className="flex justify-between items-center">
                            <span className="text-white/70">Market-Aware:</span>
                            <Badge className="bg-purple-400/20 text-purple-400">
                              {(forecast.pAware * 100).toFixed(1)}%
                            </Badge>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-white/70">Market Prior:</span>
                          <Badge className="bg-gray-400/20 text-gray-400">
                            {(forecast.p0 * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-4">Analysis Drivers</h3>
                      <div className="flex flex-wrap gap-2">
                        {forecast.drivers.map((driver, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className="border-white/20 text-white/80 text-xs leading-tight whitespace-normal break-words max-w-full"
                            title={driver}
                          >
                            {driver.length > 80 ? `${driver.substring(0, 80)}...` : driver}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="text-center sm:text-left">
                        <p className="text-lg font-semibold text-white mb-1">
                          Recommendation: {forecast.pNeutral > 0.5 ? 'YES' : 'NO'}
                        </p>
                        <p className="text-white/60 text-sm">
                          Confidence: {(Math.abs(forecast.pNeutral - 0.5) * 200).toFixed(0)}%
                        </p>
                      </div>
                      
                      <Button
                        onClick={openMarketBet}
                        className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                        size="lg"
                      >
                        {getPlatformFromUrl(url) === 'Polymarket' && (
                          <Image
                            src="/polymarket.png"
                            alt="Polymarket"
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        )}
                        {getPlatformFromUrl(url) === 'Kalshi' && (
                          <Image
                            src="/kalshi.png"
                            alt="Kalshi"
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        )}
                        Place Bet
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {forecast.markdownReport && (
                <Card className="relative z-10 backdrop-blur-md mt-6 bg-black/70 border-white/30">
                  <CardHeader>
                    <CardTitle className="text-white">Detailed Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert prose-sm max-w-none bg-black/30 rounded-lg p-4">
                      <ReactMarkdown
                        components={{
                          h1: ({children}: {children: React.ReactNode}) => <h1 className="text-xl font-bold text-white mb-4">{children}</h1>,
                          h2: ({children}: {children: React.ReactNode}) => <h2 className="text-lg font-semibold text-white mb-3 mt-6">{children}</h2>,
                          h3: ({children}: {children: React.ReactNode}) => <h3 className="text-base font-medium text-white mb-2 mt-4">{children}</h3>,
                          p: ({children}: {children: React.ReactNode}) => <p className="text-white/90 mb-3 leading-relaxed">{children}</p>,
                          ul: ({children}: {children: React.ReactNode}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                          li: ({children}: {children: React.ReactNode}) => <li className="text-white/90">{children}</li>,
                          strong: ({children}: {children: React.ReactNode}) => <strong className="text-white font-semibold">{children}</strong>,
                          em: ({children}: {children: React.ReactNode}) => <em className="text-white/80 italic">{children}</em>,
                          code: ({children}: {children: React.ReactNode}) => <code className="bg-white/10 text-purple-300 px-1 py-0.5 rounded text-xs">{children}</code>,
                        } as Components}
                      >
                        {forecast.markdownReport}
                      </ReactMarkdown>
                    </div>

                    {forecast.provenance && forecast.provenance.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-white text-lg font-semibold mb-3">Most Influential Sources</h3>
                        <ol className="space-y-2 text-sm list-decimal list-inside">
                          {Array.from(new Set(forecast.provenance)).map((url, idx) => {
                            let label = url;
                            try {
                              const u = new URL(url);
                              label = `${u.hostname.replace(/^www\./,'')}${u.pathname}`;
                            } catch {}
                            return (
                              <li key={idx} className="text-white/80">
                                <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                                  {label}
                                </a>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {!isComplete && steps.length === 0 && (
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto mb-4"
            />
            <p className="text-white/60">Starting analysis...</p>
          </div>
        )}
      </div>
      
      {/* Bottom fade overlay */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none z-40"></div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
          />
        </div>
      }
    >
      <AnalysisContent />
    </Suspense>
  );
}
