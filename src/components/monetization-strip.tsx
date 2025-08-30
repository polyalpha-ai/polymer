"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Sparkles } from "lucide-react";

export default function MonetizationStrip() {
  const [isVisible, setIsVisible] = useState(false); // Hide by default
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100 && !hasScrolled) {
        setHasScrolled(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasScrolled]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {hasScrolled && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900 text-white border-t border-neutral-700"
        >
          <div className="container max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <Sparkles className="h-5 w-5 text-yellow-400 hidden sm:block" />
                <div className="flex-1">
                  <p className="text-sm sm:text-base font-medium">
                    2 free analyses today. After that £0.50 each or £5/month (20 analyses)
                  </p>
                  <p className="text-xs text-neutral-400 hidden sm:block">
                    No card needed for free tier
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-white text-neutral-900 hover:bg-neutral-100"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Start free
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-neutral-700"
                >
                  Pricing
                </Button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-1 hover:bg-neutral-700 rounded-md transition-colors ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}