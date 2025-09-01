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
  fetch_initial: { name: 'Data Collection', description: 'Fetching market data from Polymarket' },
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
  const [mounted, setMounted] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [forecast, setForecast] = useState<ForecastCard | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractPolymarketSlug = useCallback((url: string) => {
    const match = url.match(/polymarket\.com\/event\/([^/?]+)/);
    return match ? match[1] : null;
  }, []);

  const toggleStepExpanded = useCallback((stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, expanded: !step.expanded } : step
    ));
  }, []);

  const startAnalysis = useCallback(() => {
    if (!url) return;

    const slug = extractPolymarketSlug(url);
    if (!slug) {
      setError('Invalid Polymarket URL');
      return;
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
        polymarketSlug: slug,
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
  }, [url, extractPolymarketSlug]);

  const handleProgressEvent = useCallback((event: ProgressEvent) => {
    console.log('Progress event:', event);

    if (event.type === 'error') {
      setError(event.error || 'Unknown error occurred');
      return;
    }

    if (event.type === 'complete' && event.forecast) {
      setForecast(event.forecast);
      setIsComplete(true);
      // Mark all steps as complete
      setSteps(prev => prev.map(step => ({ ...step, status: 'complete' as const })));
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

  const openPolymarketBet = useCallback(() => {
    if (url) {
      window.open(url, '_blank');
    }
  }, [url]);

  useEffect(() => {
    setMounted(true);
    // Note: Removed authentication redirect to allow anonymous users
  }, []);

  useEffect(() => {
    if (mounted && url && !isComplete && steps.length === 0) {
      startAnalysis();
    }
  }, [mounted, url, isComplete, steps.length, startAnalysis]);

  if (!mounted) return null;

  if (error) {
    // Check if this is a rate limit error for anonymous users
    const isRateLimitError = error.includes('Daily limit exceeded') || error.includes('limited to 1 free analysis');
    
    if (isRateLimitError) {
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
        
        {/* Anonymous User Banner */}
        {!user && (
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
            <a
              href={url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/90 hover:text-white text-sm break-all leading-relaxed hover:underline decoration-white/50 transition-colors"
            >
              {url}
            </a>
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
                              <CardTitle className="text-white text-lg font-semibold">
                                {step.name}
                              </CardTitle>
                              <p className="text-white/70 text-sm mt-1 leading-relaxed">
                                {step.message}
                              </p>
                              {step.timestamp && (
                                <p className="text-white/40 text-xs mt-1">
                                  {new Date(step.timestamp).toLocaleTimeString()}
                                </p>
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
                        {step.expanded && step.details && Object.keys(step.details).length > 0 && (
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
                        onClick={openPolymarketBet}
                        className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                        size="lg"
                      >
                        <Image
                          src="/polymarket.png"
                          alt="Polymarket"
                          width={20}
                          height={20}
                          className="rounded"
                        />
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
