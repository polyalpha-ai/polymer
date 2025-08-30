"use client";

import { useState } from "react";
import HeroSection from "@/components/hero-section";
import HighestROI from "@/components/highest-roi";
import ResultPanel from "@/components/result-panel";
import MonetizationStrip from "@/components/monetization-strip";
import ShareModal from "@/components/share-modal";
import TelegramBotModal from "@/components/telegram-bot-modal";
import HowItWorksModal from "@/components/how-it-works-modal";

export default function Home() {
  const [polymarketUrl, setPolymarketUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [howItWorksModalOpen, setHowItWorksModalOpen] = useState(false);

  const handleAnalyze = async (url: string) => {
    setPolymarketUrl(url);
    setIsAnalyzing(true);
    setShowResult(true);
    
    // Simulate API call
    setTimeout(() => {
      setResultData({
        verdict: "YES",
        confidence: 78,
        summary: "Based on current polling aggregates, prediction market momentum, and historical accuracy patterns",
        marketTitle: "Will Bitcoin reach $100,000 by end of 2024?",
        marketId: "sample-123",
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <>
      <div className="relative h-screen overflow-hidden flex flex-col">
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
      </div>

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
    </>
  );
}