"use client";

import { motion } from "framer-motion";
import { ThreeDCarousel } from "@/components/ui/3d-carousel";
import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign } from "lucide-react";

const mockHighROIBets = [
  {
    id: 1,
    title: "Trump wins 2024 Election",
    currentOdds: 45,
    predictedOdds: 68,
    roi: "+51%",
    confidence: 82,
    volume: "$2.4M",
    verdict: "YES",
  },
  {
    id: 2,
    title: "Bitcoin reaches $100k",
    currentOdds: 34,
    predictedOdds: 72,
    roi: "+112%",
    confidence: 78,
    volume: "$892k",
    verdict: "YES",
  },
  {
    id: 3,
    title: "Fed cuts rates March",
    currentOdds: 23,
    predictedOdds: 8,
    roi: "+65%",
    confidence: 91,
    volume: "$1.1M",
    verdict: "NO",
  },
  {
    id: 4,
    title: "GPT-5 releases Q1",
    currentOdds: 72,
    predictedOdds: 85,
    roi: "+18%",
    confidence: 65,
    volume: "$523k",
    verdict: "YES",
  },
  {
    id: 5,
    title: "Recession in 2024",
    currentOdds: 38,
    predictedOdds: 15,
    roi: "+60%",
    confidence: 73,
    volume: "$3.2M",
    verdict: "NO",
  },
];

function BetCard({ bet }: { bet: typeof mockHighROIBets[0] }) {
  return (
    <Card className="w-full h-full p-4 bg-white/95 backdrop-blur-sm border-white/20 flex flex-col justify-between">
      <div className="space-y-3">
        <h3 className="font-semibold text-sm line-clamp-2 text-neutral-900">
          {bet.title}
        </h3>
        
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-bold ${
            bet.verdict === "YES" ? "text-green-600" : "text-red-600"
          }`}>
            {bet.roi}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            bet.verdict === "YES" 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
          }`}>
            {bet.verdict}
          </span>
        </div>

        <div className="space-y-2 text-xs text-neutral-600">
          <div className="flex justify-between">
            <span>Current</span>
            <span className="font-medium">{bet.currentOdds}%</span>
          </div>
          <div className="flex justify-between">
            <span>Predicted</span>
            <span className="font-medium">{bet.predictedOdds}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-neutral-400 to-green-500 rounded-full transition-all"
              style={{ width: `${bet.confidence}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <DollarSign className="h-3 w-3" />
            {bet.volume}
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <TrendingUp className="h-3 w-3" />
            {bet.confidence}% conf
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function HighestROI() {
  const betCards = mockHighROIBets.map((bet) => (
    <BetCard key={bet.id} bet={bet} />
  ));

  return (
    <section className="relative flex-1 overflow-hidden py-6 px-4">
      <div className="container max-w-7xl mx-auto">
        <div className="mb-6">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-xl font-semibold text-white font-[family-name:var(--font-space)] flex items-center gap-2"
          >
            <TrendingUp className="h-5 w-5" />
            Highest ROI Opportunities
          </motion.h2>
          <p className="text-sm text-white/70 mt-1">
            AI-identified arbitrage opportunities with the best risk/reward
          </p>
        </div>

        <ThreeDCarousel 
          items={betCards}
          onItemClick={(index) => {
            console.log(`Clicked bet ${index}`);
          }}
        />
      </div>
    </section>
  );
}