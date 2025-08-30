"use client";

import { motion } from "framer-motion";
import { ThreeDCarousel } from "@/components/ui/3d-carousel";
import { TrendingUp } from "lucide-react";

const mockHighROIBets = [
  {
    id: 1,
    title: "Will the Fed cut rates",
    currentOdds: 45,
    predictedOdds: 68,
    roi: "+51%",
    confidence: 82,
    volume: "$2.4M",
    verdict: "YES",
  },
  {
    id: 2,
    title: "Bitcoin reaches $420k",
    currentOdds: 34,
    predictedOdds: 72,
    roi: "+112%",
    confidence: 78,
    volume: "$892k",
    verdict: "YES",
  },
  {
    id: 3,
    title: "RAG dies.",
    currentOdds: 23,
    predictedOdds: 8,
    roi: "+65%",
    confidence: 91,
    volume: "$1.1M",
    verdict: "NO",
  },
  {
    id: 4,
    title: "GPT-6 releases 2026 Q1",
    currentOdds: 72,
    predictedOdds: 85,
    roi: "+18%",
    confidence: 65,
    volume: "$523k",
    verdict: "YES",
  },
  {
    id: 5,
    title: "Recession in 2025",
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
    <div className="w-[300px] h-[180px] bg-black/20 backdrop-blur-xl rounded-xl p-4 flex flex-col justify-between hover:bg-black/40 transition-all cursor-pointer border border-white/5 shadow-xl hover:shadow-2xl hover:border-white/10">
      <div className="flex flex-col h-full justify-between">
        <div>
          <h3 className="font-medium text-sm text-white/90 mb-2 line-clamp-1">
            {bet.title}
          </h3>
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${
                bet.verdict === "YES" ? "text-emerald-300/90" : "text-rose-300/90"
              }`}>
                {bet.roi}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                bet.verdict === "YES" 
                  ? "bg-emerald-500/20 text-emerald-300/80 border border-emerald-500/20" 
                  : "bg-rose-500/20 text-rose-300/80 border border-rose-500/20"
              }`}>
                {bet.verdict}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <div className="text-white/50">
              <span>Now: </span>
              <span className="text-white/70 font-medium">{bet.currentOdds}%</span>
            </div>
            <div className="text-white/50">
              <span>AI: </span>
              <span className="text-white/70 font-medium">{bet.predictedOdds}%</span>
            </div>
            <div className="text-white/50">
              <span className="text-white/70 font-medium">{bet.volume}</span>
            </div>
          </div>
          
          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                bet.verdict === "YES" 
                  ? "bg-gradient-to-r from-emerald-500/70 to-emerald-400/70" 
                  : "bg-gradient-to-r from-rose-500/70 to-rose-400/70"
              }`}
              style={{ width: `${bet.confidence}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HighestROI() {
  const betCards = mockHighROIBets.map((bet) => (
    <BetCard key={bet.id} bet={bet} />
  ));

  return (
    <section className="relative flex-1 overflow-hidden py-8">
      <div className="w-full">
        {/* <div className="mb-4 px-6 flex flex-col items-center text-center">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-xl font-semibold text-white font-[family-name:var(--font-space)] flex items-center gap-2 justify-center"
          >
            <TrendingUp className="h-5 w-5" />
            Highest ROI Opportunities
          </motion.h2>
          <p className="text-sm text-white/70 mt-1">
            AI-identified arbitrage opportunities with the best risk/reward
          </p>
        </div> */}

        <ThreeDCarousel 
          items={betCards}
          autoRotate={true}
          onItemClick={(index) => {
            console.log(`Clicked bet ${index}`);
          }}
        />
      </div>
    </section>
  );
}