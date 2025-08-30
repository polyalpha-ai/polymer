"use client";

import { cn } from "@/lib/utils";

interface VideoBackgroundProps {
  src: string;
  className?: string;
}

export const VideoBackground = ({ src, className }: VideoBackgroundProps) => {
  return (
    <div className={cn("fixed inset-0 -z-10", className)}>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
      {/* Dark overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
};