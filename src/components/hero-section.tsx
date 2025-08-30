"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

interface HeroSectionProps {
  onAnalyze: (url: string) => void;
  isAnalyzing: boolean;
  onShowHowItWorks: () => void;
}

export default function HeroSection({ onAnalyze, isAnalyzing, onShowHowItWorks }: HeroSectionProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const validatePolymarketUrl = (url: string) => {
    const polymarketRegex = /^https?:\/\/(www\.)?polymarket\.com\/.+/i;
    return polymarketRegex.test(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url) {
      setError("Please enter a Polymarket URL");
      return;
    }

    if (!validatePolymarketUrl(url)) {
      setError("That doesn't look like a Polymarket URL");
      return;
    }

    onAnalyze(url);
  };

  const handleTrySample = () => {
    const sampleUrl = "https://polymarket.com/event/bitcoin-100k-2024";
    setUrl(sampleUrl);
    onAnalyze(sampleUrl);
  };

  return (
    <section className="relative flex-shrink-0 flex items-center justify-center px-4 pt-24 md:pt-32 md:pb-6">
      <div className="container max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.215, 0.61, 0.355, 1] }}
          className="text-center space-y-8"
        >
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.7, ease: [0.215, 0.61, 0.355, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight font-[family-name:var(--font-space)]"
            >
              <span className="text-white drop-shadow-lg">
                See the future.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
              className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-md"
            >
              In hindsight, we all would've bought Bitcoin. 
              <br className="hidden sm:block" />
              Seer into the future, so you can retire off the next one.
            </motion.p>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1, ease: [0.215, 0.61, 0.355, 1] }}
            onSubmit={handleSubmit}
            className="space-y-4 max-w-xl mx-auto"
          >
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="url"
                    placeholder="Paste Polymarket URL..."
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError("");
                    }}
                    className={`h-12 md:h-14 text-base px-4 md:px-6 bg-white/95 backdrop-blur-sm border-white/20 focus:bg-white focus:border-white/40 placeholder:text-neutral-500 ${
                      error ? "border-red-500 animate-shake" : ""
                    }`}
                    disabled={isAnalyzing}
                  />
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -bottom-6 left-0 text-sm text-red-400 drop-shadow-md"
                    >
                      {error}
                    </motion.p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isAnalyzing}
                  className="h-12 md:h-14 px-6 md:px-8 bg-black text-white hover:bg-black/90 transition-all font-medium"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      Analyzing
                    </span>
                  ) : (
                    <>
                      👀  the future.
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm">
              <button
                type="button"
                onClick={handleTrySample}
                className="text-white/70 hover:text-white transition-colors"
              >
                Try a sample
              </button>
              <span className="text-white/50">•</span>
              <button
                type="button"
                onClick={onShowHowItWorks}
                className="text-white/70 hover:text-white transition-colors"
              >
                What's this?
              </button>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
}