"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import ZoomTransition from "@/components/zoom-transition";
import Image from "next/image";

interface HeroSectionProps {
  onAnalyze: (url: string) => void;
  isAnalyzing: boolean;
  onShowHowItWorks: () => void;
}

export default function HeroSection({ onAnalyze, isAnalyzing, onShowHowItWorks }: HeroSectionProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();

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

    // Trigger zoom transition
    setIsTransitioning(true);
  };

  const handleTransitionComplete = () => {
    // Navigate to analysis page
    router.push(`/analysis?url=${encodeURIComponent(url)}`);
  };

  const handleTrySample = () => {
    const sampleUrl = "https://polymarket.com/event/bitcoin-100k-2024";
    setUrl(sampleUrl);
    // Small delay to let URL populate, then trigger transition
    setTimeout(() => {
      setIsTransitioning(true);
    }, 100);
  };

  return (
    <section className="relative flex-shrink-0 flex items-center justify-center px-4 pt-24 md:pt-32 md:pb-6">
      <div className="container max-w-5xl mx-auto">
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

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
              className="flex justify-center"
            >
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/30 max-w-2xl">
                <p className="text-lg md:text-xl text-white/90 leading-relaxed text-center">
                  In hindsight, we all would&apos;ve bought Bitcoin. 
                  <br className="hidden sm:block" />
                  Seer into the future, so you can retire off the next one.
                </p>
              </div>
            </motion.div>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1, ease: [0.215, 0.61, 0.355, 1] }}
            onSubmit={handleSubmit}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <div className="relative flex gap-2 transition-all duration-300">
              <motion.div 
                className="relative"
                initial={{ width: "100%" }}
                animate={{ width: url ? "75%" : "100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Input
                  type="url"
                  placeholder="Paste Polymarket URL..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                  }}
                  className={`h-12 md:h-14 text-base px-4 md:px-6 bg-white/95 backdrop-blur-sm border-white/20 focus:bg-white focus:border-white/40 placeholder:text-neutral-500 w-full ${
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
              </motion.div>
              
              <AnimatePresence>
                {url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: "15%" }}
                    exit={{ opacity: 0, scale: 0.8, width: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isAnalyzing || isTransitioning}
                      className="h-24 md:h-14 w-full bg-black text-white hover:bg-black/90 transition-all font-medium"
                    >
                      {isAnalyzing || isTransitioning ? (
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        </span>
                      ) : (
                        <ArrowRight className="h-8 w-8" />
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Powered by Valyu pill - below input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.3, ease: "easeOut" }}
              className="flex justify-center mt-4"
            >
              <div className="relative flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                <span className="text-sm text-white/80 font-medium">Powered by</span>
                <a
                  href="https://platform.valyu.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center hover:scale-105 transition-transform"
                >
                  <Image
                    src="/valyu.svg"
                    alt="Valyu"
                    width={80}
                    height={80}
                    className="h-4 w-auto opacity-80 hover:opacity-100 transition-opacity"
                  />
                </a>
              </div>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>
      
      <ZoomTransition 
        isActive={isTransitioning} 
        onComplete={handleTransitionComplete}
      />
    </section>
  );
}