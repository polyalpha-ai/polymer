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
  description: "Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations. Free to start.",
  keywords: ["polymarket", "betting", "prediction markets", "AI analysis", "crypto betting"],
  authors: [{ name: "Polyseer" }],
  openGraph: {
    title: "Polyseer — AI Verdicts for Polymarket",
    description: "Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations.",
    url: "https://polyseer.xyz",
    siteName: "Polyseer",
    images: [
      {
        url: "/og-image.png",
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
        <Providers>
          <AuthInitializer>
            <OpenAICodexAnimatedBackground />
            <Header />
            <main className="relative min-h-screen">{children}</main>
            
            {/* Fixed Footer Elements */}
            <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
              <div className="container mx-auto px-4 md:px-6">
                <div className="flex justify-between items-end pb-4">
                  {/* Powered by Valyu - Bottom Left */}
                  <div className="relative pointer-events-auto">
                    {/* Background blur effect */}
                    <div 
                      className="absolute -inset-4 rounded-full blur-2xl"
                      style={{
                        background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                      }}
                    ></div>
                    <div className="relative flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <span className="text-sm text-white/90 font-medium">Powered by</span>
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
                          className="h-5 w-auto opacity-90 hover:opacity-100 transition-opacity"
                        />
                      </a>
                    </div>
                  </div>
                  
                  {/* Not Financial Advice - Bottom Right */}
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
            </div>
          </AuthInitializer>
        </Providers>
      </body>
    </html>
  );
}
