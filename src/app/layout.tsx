import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { OpenAICodexAnimatedBackground } from "@/components/ui/open-ai-codex-animated-background";
import Header from "@/components/header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polyseer — AI Verdicts for Polymarket (Yes or No in seconds)",
  description: "Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations. Free to start.",
  keywords: ["polymarket", "betting", "prediction markets", "AI analysis", "crypto betting"],
  authors: [{ name: "Polyseer" }],
  openGraph: {
    title: "Polyseer — AI Verdicts for Polymarket",
    description: "Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations.",
    url: "https://polyseer.ai",
    siteName: "Polyseer",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Verdict: ✅ YES • Confidence 78% • polyseer.ai",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polyseer — AI Verdicts for Polymarket",
    description: "Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100`}
      >
        <OpenAICodexAnimatedBackground />
        <Header />
        <main className="relative min-h-screen">{children}</main>
      </body>
    </html>
  );
}
