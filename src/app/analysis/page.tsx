"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white font-[family-name:var(--font-space)] mb-4">
          Deep Analysis
        </h1>
        <p className="text-white/70 mb-2">Analyzing:</p>
        <p className="text-white/50 text-sm break-all max-w-md">{url}</p>
      </motion.div>
    </div>
  );
}