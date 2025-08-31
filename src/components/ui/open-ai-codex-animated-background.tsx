"use client";

import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const UnicornScene = dynamic(() => import("unicornstudio-react"), {
  ssr: false,
});

export const OpenAICodexAnimatedBackground = () => {
  const [mounted, setMounted] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: 1920,
    height: 1080,
  });

  useEffect(() => {
    setMounted(true);
    
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't render on server
  if (!mounted) {
    return <div className="fixed inset-0 -z-10 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900" />;
  }

  return (
    <div className={cn("fixed inset-0 -z-10")}>
      <UnicornScene 
        production={true} 
        projectId="1grEuiVDSVmyvEMAYhA6" 
        width={windowSize.width} 
        height={windowSize.height} 
      />
    </div>
  );
};