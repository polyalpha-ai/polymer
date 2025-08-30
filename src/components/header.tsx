"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import TelegramBotModal from "@/components/telegram-bot-modal";
import { ConnectPolymarket } from "@/components/connect-polymarket";

export default function Header() {
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  return (
    <header className="absolute top-0 left-0 right-0 z-50 w-full">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-20 items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-space)] drop-shadow-md">
                Polyseer
              </span>
            </Link>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="flex items-center gap-1"
          >
            <ConnectPolymarket />
            
            <Button
              variant="ghost"
              size="default"
              className="text-white/90 hover:text-white hover:bg-white/10 drop-shadow-md text-base px-4 py-2"
            >
              Sign in
            </Button>
          </motion.nav>
        </div>
      </div>
      
      <TelegramBotModal
        open={telegramModalOpen}
        onOpenChange={setTelegramModalOpen}
      />
    </header>
  );
}