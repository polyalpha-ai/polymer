'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import TelegramBotModal from '@/components/telegram-bot-modal';
import { ConnectPolymarket } from '@/components/connect-polymarket';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { AuthModal } from '@/components/auth-modal';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  User, 
  History, 
  MessageSquare, 
  Trash2, 
  CreditCard, 
  BarChart3, 
  Monitor, 
  LogOut
} from 'lucide-react';

interface AnalysisSession {
  id: string;
  market_question?: string;
  market_url: string;
  completed_at: string;
  valyu_cost?: number;
  report?: {
    market_question?: string;
    probability?: number;
    confidence?: string;
  };
}

export default function Header() {
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'system'>('light');
  
  const pathname = usePathname();
  const router = useRouter();
  const isAnalysisPage = pathname === '/analysis';
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  
  // Derived state for subscription info
  const subscriptionTier = user?.subscription_tier || 'free';
  const subscriptionStatus = user?.subscription_status || 'inactive';
  const analysesRemaining = user?.analyses_remaining || 0;
  const hasPolarCustomer = !!user?.polar_customer_id;
  const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE !== 'production';
  
  const tier = subscriptionTier === 'pay_per_use' ? 'Pay-per-use' : 
               subscriptionTier === 'subscription' ? 'Unlimited' : 
               subscriptionTier;
               
  const displayText = subscriptionTier === 'subscription' ? 
                     `${analysesRemaining} analyses left` : 
                     subscriptionStatus === 'active' ? 'Active' : 
                     'Inactive';

  useEffect(() => {
    setMounted(true);
    
    // Initialize theme from localStorage or default to light
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
      if (savedTheme) {
        setCurrentTheme(savedTheme);
      } else {
        // Default to light theme
        setCurrentTheme('light');
      }
    }
  }, []);
  
  // Save theme changes to localStorage
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem('theme', currentTheme);
    }
  }, [currentTheme, mounted]);
  
  // Fetch analysis history when dropdown opens
  const fetchAnalysisHistory = async () => {
    if (!user) return;
    
    setLoadingSessions(true);
    try {
      const response = await fetch('/api/user/history');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoadingSessions(false);
    }
  };
  
  const handleSessionSelect = (sessionId: string) => {
    router.push(`/analysis?id=${sessionId}`);
  };
  
  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/user/history/${sessionId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };
  
  const handleViewUsage = async () => {
    if (loadingPortal) {
      console.log('[User Menu] Already loading portal, skipping...');
      return;
    }
    
    setLoadingPortal(true);
    
    try {
      console.log('[User Menu] Opening billing portal...');
      
      // Simple fetch - server handles auth via cookies automatically
      const response = await fetch('/api/customer-portal');

      console.log('[User Menu] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[User Menu] Success! Opening portal...');
        if (data.redirectUrl) {
          window.open(data.redirectUrl, '_blank');
        } else {
          throw new Error('No redirect URL in response');
        }
      } else {
        const error = await response.json();
        console.error('[User Menu] API Error:', error);
        alert(`Failed to access billing portal: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('[User Menu] Exception:', error);
      alert(`Error: ${error.message || 'Failed to open billing portal'}`);
    } finally {
      setLoadingPortal(false);
    }
  };
  
  const handleCheckout = async (plan: 'pay_per_use' | 'subscription') => {
    try {
      const response = await fetch('/api/polar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      
      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  return (
    <header className='absolute top-0 left-0 right-0 z-50 w-full'>
      {/* Glass background for analysis page */}
      {isAnalysisPage && (
        <div className='absolute inset-0 bg-black/30 backdrop-blur-md'></div>
      )}

      <div className='relative w-full px-2 md:px-4'>
        <div className='flex h-14 items-center justify-between'>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          >
            <Link href='/' className='inline-block pt-2'>
              <Image
                src='/polyseer.svg'
                alt='Polyseer'
                width={200}
                height={80}
                className='h-24 md:h-24 w-auto drop-shadow-md'
                priority
              />
            </Link>
          </motion.div>

          {/* Center title for analysis page */}
          {isAnalysisPage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className='absolute left-1/2 transform -translate-x-1/2'
            >
              <h1 className='text-lg md:text-2xl font-bold text-white font-[family-name:var(--font-space)] drop-shadow-md'>
                Deep Analysis
              </h1>
            </motion.div>
          )}

          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            className='flex items-center gap-0.5 md:gap-1'
          >
            {/* <ConnectPolymarket /> */}

{mounted && user ? (
              <DropdownMenu onOpenChange={(open) => open && fetchAnalysisHistory()}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-white/20 hover:border-white/30 transition-all text-white/90 hover:text-white drop-shadow-md">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-80 max-h-[80vh] overflow-hidden">
                  {/* User Info Section */}
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {user.email?.split('@')[0]}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {tier === 'free' ? 'Free' : tier}
                          </Badge>
                          <span className="text-xs text-gray-500">{displayText}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis History Section */}
                  <div className="border-b">
                    <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2">
                      <History className="h-4 w-4" />
                      Analysis History
                    </DropdownMenuLabel>
                    {loadingSessions ? (
                      <div className="h-[120px]">
                        <ScrollArea className="h-full">
                          <div className="p-2">
                            <div className="space-y-2">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                              ))}
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="p-3 text-center text-sm text-gray-500 h-[60px] flex items-center justify-center">
                        No analysis history yet
                      </div>
                    ) : (
                      <div className="h-[120px]">
                        <div className="h-full overflow-y-auto">
                          <div className="p-1 space-y-1">
                            {sessions.slice(0, 5).map((session) => (
                              <div key={session.id} className="flex items-center gap-2 p-2 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <div 
                                  className="flex-1 min-w-0 cursor-pointer"
                                  onClick={() => handleSessionSelect(session.id)}
                                >
                                  <div className="text-sm truncate">
                                    {session.report?.market_question || session.market_url}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(session.completed_at).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSession(session.id);
                                  }}
                                  title="Delete analysis"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Menu Actions */}
                  <DropdownMenuItem onClick={() => setShowSettings(true)}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  
                  {/* Show Subscription only for free users who have never had a Polar account */}
                  {subscriptionTier === 'free' && !hasPolarCustomer && (
                    <DropdownMenuItem onClick={() => {
                      setShowSubscription(true);
                      // Track subscription modal open
                      if (typeof window !== 'undefined') {
                        import('@vercel/analytics').then(({ track }) => {
                          track('Subscription Modal Opened', { 
                            location: 'user_menu',
                            tier: subscriptionTier 
                          });
                        });
                      }
                    }}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Subscription
                    </DropdownMenuItem>
                  )}

                  {/* Show Usage Dashboard for any user with a Polar customer account (including cancelled) */}
                  {hasPolarCustomer && (
                    <DropdownMenuItem onClick={() => {
                      // Track billing portal click
                      if (typeof window !== 'undefined') {
                        import('@vercel/analytics').then(({ track }) => {
                          track('Usage Dashboard Clicked', { 
                            tier: subscriptionTier 
                          });
                        });
                      }
                      handleViewUsage();
                    }} disabled={loadingPortal}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      {loadingPortal ? 'Opening Portal...' : 'View Usage & Billing'}
                    </DropdownMenuItem>
                  )}

                  {/* Theme Switcher with Monetization */}
                  <div className="px-2 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Theme</span>
                      </div>
                      <ThemeSwitcher
                        value={currentTheme}
                        onChange={setCurrentTheme}
                        requiresSubscription={subscriptionTier === 'free'}
                        hasSubscription={subscriptionTier !== 'free'}
                        onUpgradeClick={() => {
                          setShowSubscription(true);
                          // Track dark mode upgrade click
                          if (typeof window !== 'undefined') {
                            import('@vercel/analytics').then(({ track }) => {
                              track('Dark Mode Upgrade Clicked', { 
                                tier: subscriptionTier 
                              });
                            });
                          }
                        }}
                        userId={user?.id}
                        sessionId={`session_${Date.now()}`}
                        tier={subscriptionTier}
                        className="ml-auto"
                      />
                    </div>
                    {subscriptionTier === 'pay_per_use' && (
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        $0.01 per switch
                      </div>
                    )}
                    {subscriptionTier === 'subscription' && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1 text-right">
                        Unlimited switches
                      </div>
                    )}
                    {subscriptionTier === 'free' && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 text-right">
                        Premium feature
                      </div>
                    )}
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={async () => {
                    console.log('[Header] Sign out button clicked')
                    try {
                      const result = await signOut()
                      console.log('[Header] Sign out result:', result)
                      if (result?.error) {
                        console.error('[Header] Sign out error:', result.error)
                      } else {
                        console.log('[Header] Sign out successful')
                      }
                    } catch (error) {
                      console.error('[Header] Sign out exception:', error)
                    }
                  }}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
) : mounted && !isDevelopment ? (
              <Button
                variant='ghost'
                size='sm'
                className='text-white/90 hover:text-white hover:bg-white/10 drop-shadow-md text-base px-3 py-1.5'
                onClick={() => {
                  setAuthModalOpen(true);
                  // Track signup button click
                  if (typeof window !== 'undefined') {
                    import('@vercel/analytics').then(({ track }) => {
                      track('Sign In Button Clicked', { location: 'header' });
                    });
                  }
                }}
              >
                Sign in
              </Button>
            ) : null}
            
            {/* Subscription Modal */}
            {showSubscription && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSubscription(false)}>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold mb-4">Choose a Plan</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Pay Per Use</h4>
                      <p className="text-sm text-gray-600 mb-3">Pay only for what you use</p>
                      <Button onClick={() => {
                        // Track pay-per-use button click
                        if (typeof window !== 'undefined') {
                          import('@vercel/analytics').then(({ track }) => {
                            track('Checkout Started', { 
                              plan: 'pay_per_use',
                              tier: subscriptionTier 
                            });
                          });
                        }
                        handleCheckout('pay_per_use');
                      }} className="w-full">Get Started</Button>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Monthly Subscription</h4>
                      <p className="text-sm text-gray-600 mb-3">$100/month for 20 analyses</p>
                      <Button onClick={() => {
                        // Track subscription button click
                        if (typeof window !== 'undefined') {
                          import('@vercel/analytics').then(({ track }) => {
                            track('Checkout Started', { 
                              plan: 'subscription',
                              tier: subscriptionTier 
                            });
                          });
                        }
                        handleCheckout('subscription');
                      }} className="w-full">Subscribe</Button>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setShowSubscription(false)} className="w-full mt-4">Cancel</Button>
                </div>
              </div>
            )}
            
            {/* Profile Settings Modal */}
            {showSettings && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold mb-4">Profile Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <div className="text-sm text-gray-600">{user?.email}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">User ID</label>
                      <div className="text-xs font-mono text-gray-600">{user?.id}</div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setShowSettings(false)} className="w-full mt-4">Close</Button>
                </div>
              </div>
            )}
          </motion.nav>
        </div>
      </div>

      <TelegramBotModal
        open={telegramModalOpen}
        onOpenChange={setTelegramModalOpen}
      />
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      />
    </header>
  );
}