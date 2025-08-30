"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, Clock, DollarSign, Calendar, Flame } from "lucide-react";

const mockTrendingBets = [
  {
    id: 1,
    title: "Will Trump win the 2024 Presidential Election?",
    verdict: "YES",
    confidence: 82,
    updatedMins: 23,
    impliedOdds: 61,
    volume: "$2.4M",
    endsIn: "2d",
    isViral: true,
  },
  {
    id: 2,
    title: "Will Bitcoin reach $100,000 by end of 2024?",
    verdict: "NO",
    confidence: 65,
    updatedMins: 45,
    impliedOdds: 34,
    volume: "$184k",
    endsIn: "5d",
    isViral: false,
  },
  {
    id: 3,
    title: "Will OpenAI release GPT-5 in Q1 2024?",
    verdict: "YES",
    confidence: 78,
    updatedMins: 12,
    impliedOdds: 72,
    volume: "$523k",
    endsIn: "1w",
    isViral: false,
  },
  {
    id: 4,
    title: "Will the Fed cut rates in March 2024?",
    verdict: "NO",
    confidence: 91,
    updatedMins: 5,
    impliedOdds: 23,
    volume: "$1.1M",
    endsIn: "3d",
    isViral: false,
  },
  {
    id: 5,
    title: "Will Tesla stock reach $300 in 2024?",
    verdict: "YES",
    confidence: 58,
    updatedMins: 67,
    impliedOdds: 45,
    volume: "$892k",
    endsIn: "1mo",
    isViral: false,
  },
  {
    id: 6,
    title: "Will there be a recession in 2024?",
    verdict: "NO",
    confidence: 73,
    updatedMins: 34,
    impliedOdds: 38,
    volume: "$3.2M",
    endsIn: "2mo",
    isViral: true,
  },
];

const filters = ["All", "Politics", "Crypto", "Sports", "Tech"];

export default function TrendingBets() {
  const [selectedFilter, setSelectedFilter] = useState("All");

  return (
    <section className="relative flex-1 overflow-hidden py-6 px-4">
      <div className="container max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-lg font-semibold text-white font-[family-name:var(--font-space)]"
          >
            Trending now
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="hidden sm:flex gap-2"
          >
            {filters.slice(0, 3).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  selectedFilter === filter
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </motion.div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {mockTrendingBets.slice(0, 4).map((bet, index) => (
            <motion.div
              key={bet.id}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="min-w-[300px] md:min-w-[350px]"
            >
              <Card className="p-3 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02] bg-white/95 backdrop-blur-sm border-white/20 h-full">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">
                    {bet.title}
                  </h3>

                  <div className="flex gap-2">
                    <span className={`text-xs font-medium ${
                      bet.verdict === "YES" ? "text-green-600" : "text-red-600"
                    }`}>
                      {bet.verdict === "YES" ? "✅ YES" : "❌ NO"}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {bet.confidence}% conf
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <span>{bet.impliedOdds}%</span>
                    <span>{bet.volume}</span>
                    <span>{bet.endsIn}</span>
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="bg-neutral-900/90 dark:bg-white/90 text-white dark:text-neutral-900 px-3 py-1 rounded-full text-sm font-medium">
                    Open AI report →
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {mockTrendingBets.length === 0 && (
          <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">
            No trending right now. Paste a link to analyze.
          </div>
        )}
      </div>
    </section>
  );
}