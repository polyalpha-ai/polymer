import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { OpenAICodexAnimatedBackground } from "@/components/ui/open-ai-codex-animated-background";
import Header from "@/components/header";
import { Providers } from "@/components/providers";
import { AuthInitializer } from "@/components/auth-initializer";
import Image from "next/image";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polyseer | See the future.",
  description: "Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations.",
  keywords: ["polymarket", "prediction markets", "AI deep research"],
  authors: [{ name: "Polyseer" }],
  openGraph: {
    title: "Polyseer — AI Verdicts for Polymarket",
    description: "Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations.",
    url: "https://polyseer.xyz",
    siteName: "Polyseer",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Verdict: ✅ YES • Confidence 78% • polyseer.xyz",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polyseer — AI Verdicts for Polymarket",
    description: "Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations.",
    images: ["/og.png"],
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
        <Providers>
          <AuthInitializer>
            <OpenAICodexAnimatedBackground />
            <Header />
            <main className="relative min-h-screen">{children}</main>
            
            {/* Fixed Footer Elements */}
            <div className="fixed bottom-0 right-4 z-40 pointer-events-none">
              <div className="pb-4">
                {/* Not Financial Advice - Far Right */}
                <div className="relative pointer-events-auto">
                  {/* Background blur effect */}
                  <div 
                    className="absolute -inset-4 rounded-full blur-2xl"
                    style={{
                      background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                    }}
                  ></div>
                  <div className="relative bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <span className="text-sm text-white/90 font-medium">Not financial advice</span>
                  </div>
                </div>
              </div>
            </div>
          </AuthInitializer>
        </Providers>
      </body>
    </html>
  );
}
