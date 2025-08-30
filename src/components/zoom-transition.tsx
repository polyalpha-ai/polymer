"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface ZoomTransitionProps {
  isActive: boolean;
  onComplete?: () => void;
}

export default function ZoomTransition({ isActive, onComplete }: ZoomTransitionProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const progress = useMotionValue(0);

  // Create the main zoom scale
  const scale = useTransform(progress, [0, 1], [1, 50]);
  const opacity = useTransform(progress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const fadeOpacity = useTransform(progress, [0.7, 1], [0, 1]);

  useEffect(() => {
    if (isActive && !isAnimating) {
      setIsAnimating(true);
      
      // Animate the progress from 0 to 1
      const controls = animate(progress, 1, {
        duration: 2.0,
        ease: [0.22, 1, 0.36, 1],
        onComplete: () => {
          setTimeout(() => {
            onComplete?.();
          }, 200);
        }
      });

      return () => controls.stop();
    }
  }, [isActive, isAnimating, progress, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none overflow-hidden bg-black">
      {/* Main zoom element that scales the entire viewport */}
      <motion.div 
        style={{ 
          scale,
          opacity,
          transformOrigin: "center center"
        }}
        className="absolute inset-0 w-full h-full"
      >
        {/* Tunnel effect background */}
        <div className="w-full h-full bg-gradient-radial from-transparent via-white/5 to-white/20" />
        
        {/* Speed lines radiating from center */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 origin-left bg-white/30"
            style={{
              width: '200vw',
              height: '1px',
              transform: `translate(-50%, -50%) rotate(${(360 / 30) * i}deg)`,
            }}
          />
        ))}
        
        {/* Central bright point */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 bg-white rounded-full opacity-90 shadow-[0_0_50px_rgba(255,255,255,0.8)]" />
        </div>
      </motion.div>
      
      {/* Final fade to black */}
      <motion.div 
        className="absolute inset-0 bg-black"
        style={{
          opacity: fadeOpacity
        }}
      />
    </div>
  );
}