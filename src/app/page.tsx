"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HeroSection from "@/components/hero-section";
import HighestROI from "@/components/highest-roi";
import ResultPanel from "@/components/result-panel";
import MonetizationStrip from "@/components/monetization-strip";
import ShareModal from "@/components/share-modal";
import TelegramBotModal from "@/components/telegram-bot-modal";
import HowItWorksModal from "@/components/how-it-works-modal";
import LoadingScreen from "@/components/loading-screen";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { AuthModal } from "@/components/auth-modal";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const [polymarketUrl, setPolymarketUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [howItWorksModalOpen, setHowItWorksModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const { user, initialized, refreshUser } = useAuthStore();
  const router = useRouter();

  const handleAnalyze = async (url: string) => {
    // Check if user is authenticated
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    
    // Navigate to analysis page with URL
    router.push(`/analysis?url=${encodeURIComponent(url)}`);
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
    // Delay content appearance for smooth transition
    setTimeout(() => {
      setContentVisible(true);
    }, 100);
  };

  // Skip loading screen on auth redirect or if already initialized
  useEffect(() => {
    // Check if we're coming from auth callback or checkout
    const urlParams = new URLSearchParams(window.location.search);
    const fromAuth = urlParams.get('from_auth');
    const checkoutSuccess = urlParams.get('checkout');
    
    if (fromAuth || (initialized && user)) {
      // Skip loading screen if coming from auth or already logged in
      setIsLoading(false);
      setContentVisible(true);
    }
    
    // Handle checkout success
    if (checkoutSuccess === 'success' && user) {
      // Clean up URL
      router.replace('/');
      // Refresh user data to get updated subscription info
      const intervals = [1000, 2000, 3000, 5000];
      intervals.forEach(delay => {
        setTimeout(() => refreshUser(), delay);
      });
    }
  }, [initialized, user, router, refreshUser]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoadingScreen onComplete={handleLoadingComplete} />
        )}
      </AnimatePresence>

      <motion.div 
        className="relative h-screen overflow-hidden flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: contentVisible ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <HeroSection 
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          onShowHowItWorks={() => setHowItWorksModalOpen(true)}
        />
        
        {showResult && (
          <ResultPanel
            data={resultData}
            isLoading={isAnalyzing}
            onShare={() => setShareModalOpen(true)}
          />
        )}
        
        <HighestROI />
        
        <MonetizationStrip />
      </motion.div>

      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        marketTitle={resultData?.marketTitle}
        verdict={resultData?.verdict}
        confidence={resultData?.confidence}
      />

      <TelegramBotModal
        open={telegramModalOpen}
        onOpenChange={setTelegramModalOpen}
      />

      <HowItWorksModal
        open={howItWorksModalOpen}
        onOpenChange={setHowItWorksModalOpen}
      />

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      />
    </>
  );
}