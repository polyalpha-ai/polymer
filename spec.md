Polyseer — Landing Page Spec (v1)
Global

Logo: Polyseer (wordmark). Click → home.

Header (right):

Button: Connect Polymarket (secondary).

Hover: “Link your wallet for 1-tap bets later.”

Button: Add Telegram Bot (secondary).

Hover: “Get daily AI picks + instant market pings.”

Button: Sign in (ghost) → magic link.

Footer (left→right): “Not financial advice.” • Terms • Privacy • Contact • X • GitHub

Section A — Hero (top ⅔ viewport)

H1: Should you bet on this? Yes or No.

Sub: Paste any Polymarket link. Get analyst-grade research in seconds.

Input Row:

Input (full-width): placeholder Paste Polymarket URL…

Paste-detect autofill. Enter triggers analyze.

Validation error: “That doesn’t look like a Polymarket URL.” (shake)

Primary CTA: Analyze Now

On click: skeleton loads Result Panel below.

Quick actions (inline, right-aligned, small):

Link: Try a sample → loads a hot market.

Link: What’s this? → opens “How it works” modal.

Trust row (tiny text, muted): “Powered by Valyu DeepSearch + OpenAI · Analyst-grade sources · Citation-rich”

Section B — Trending Bets (above the fold, 2 rows × 3)

Card spec (tap anywhere opens Report page):

Title (1 line, ellipsize)

Pills: AI Verdict: ✅ YES or ❌ NO • Confidence: 78% • ⏱ Updated: 23m

Mini stat row: Implied: 61% • Volume: $184k • Ends: 2d

Share chip if viral: 🔥 Most shared today

Hover microcopy: “Open AI report →”

Above grid (left): Trending now
Above grid (right): Filter [All | Politics | Crypto | Sports | Tech] (client-only)

Section C — Monetization strip (sticky bottom on first view)

Text: 2 free analyses today. After that £0.50 each or £5/month (20 analyses)

Buttons: Start free (primary) • Pricing (ghost)

Tiny: “No card needed for free tier.”

Interactions & Virality
Result Panel (inline after Analyze)

Verdict badge (large): ✅ YES or ❌ NO

One-liner: “Polyseer thinks YES based on X, Y, Z.”

Buttons:

View Full Report (expands accordion with sources, charts, reasoning)

Share Verdict (opens share modal)

Copy TL;DR (copies 1-tweet summary)

Free credit nudge: You have 1 free analysis left today. → Get more free by sharing

Share Modal (viral loop)

Title: “Make this go 🚀”

Tabs: X | Reddit | Link | Image

Prefills:

X:

I ran this Polymarket through Polyseer. Verdict: ✅ YES (78% confidence).
Analyst-grade report + sources in 5s. Try it: {url}?via=x_share&utm={utm}


Reddit (r/Polymarket, r/CryptoMarkets):
Title: “AI verdict on {market}: ✅ YES (report inside)”
Body: short blurb + link

Link: copy share URL with referral ?r={code}

Image (OG): “Export share card” (render verdict card for screenshot)

Footer: “Share & get 1 free analysis (auto-applied).”

Telegram Bot CTA (modal)

Title: “Add Polyseer Bot”

Body: “Daily AI pick at 9am + instant pings when odds move or our verdict flips.”

Button: Open in Telegram

Toggle: Send alerts for markets I follow (default on)

“How it works” Modal (60-second trust)

3 bullets:

Crawl sources via Valyu DeepSearch (citations).

Synthesize with OpenAI into an analyst brief.

Output a Yes/No verdict + confidence + sources.

Small: “Not financial advice. For research. Markets are risky.”

Copy (exact strings)

Header buttons

Connect Polymarket

Tooltip: “Link wallet for one-tap trades (optional).”

Add Telegram Bot

Tooltip: “Daily picks + real-time flips.”

Hero

H1: “Should you bet on this? Yes or No.”

Sub: “Paste any Polymarket link. Get analyst-grade research in seconds.”

Input placeholder: “Paste Polymarket URL…”

Primary CTA: “Analyze Now”

Quick: “Try a sample” • “What’s this?”

Trending

Section title: “Trending now”

Card pills: “AI Verdict: ✅ YES / ❌ NO” • “Confidence: {x}%” • “⏱ Updated: {t}”

Viral badge: “🔥 Most shared today”

Monetization

Strip: “2 free analyses today. Then £0.50 each or £5/month (20 analyses).”

Buttons: “Start free” • “Pricing”

Result panel

Buttons: “View Full Report” • “Share Verdict” • “Copy TL;DR”

Free nudge: “You have {n} free analysis left today. Share to earn more.”

Toasts

Success: “Report ready.”

Copied: “Copied to clipboard.”

Error: “Couldn’t fetch this market. Try another link.”

Legal

Footer small: “Not financial advice. For research only.”

States

Input

Idle: placeholder grey

Validating: spinner in button

Error: red outline + message

Loading

Skeleton: verdict badge placeholder, two pill placeholders, 3 line body, 3 source rows ghosted.

Empty Trending

Message: “No trending right now. Paste a link to analyze.”

Analytics & Attribution (events)

hero_analyze_clicked {url}

report_loaded {market_id, verdict, confidence}

share_opened {network}

share_completed {network} (on window blur + return or copy)

telegram_add_clicked

connect_polymarket_clicked

referral_applied {code}

payment_started {plan: “per_use”|“sub”}

payment_success {amount, plan}

UTM defaults for share links:
utm_source={x|reddit|direct}&utm_medium=share&utm_campaign=polyseer_viral_v1

SEO / OG

Title: “Polyseer — AI Verdicts for Polymarket (Yes or No in seconds)”

Meta: “Paste any Polymarket link and get an analyst-grade Yes/No verdict with citations. Free to start.”

OG image: Dark card with “Verdict: ✅ YES • Confidence 78% • polyseer.ai”


For the background of the app i want to use animated background paths. A prompt that gets AI to implement this is below (21st.dev component prompt)

"You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
background-paths.tsx
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

function FloatingPaths({ position }: { position: number }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        color: `rgba(15,23,42,${0.1 + i * 0.03})`,
        width: 0.5 + i * 0.03,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="w-full h-full text-slate-950 dark:text-white"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="currentColor"
                        strokeWidth={path.width}
                        strokeOpacity={0.1 + path.id * 0.03}
                        initial={{ pathLength: 0.3, opacity: 0.6 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.3, 0.6, 0.3],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 20 + Math.random() * 10,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

export function BackgroundPaths({
    title = "Background Paths",
}: {
    title?: string;
}) {
    const words = title.split(" ");

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white dark:bg-neutral-950">
            <div className="absolute inset-0">
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />
            </div>

            <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="max-w-4xl mx-auto"
                >
                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
                        {words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                className="inline-block mr-4 last:mr-0"
                            >
                                {word.split("").map((letter, letterIndex) => (
                                    <motion.span
                                        key={`${wordIndex}-${letterIndex}`}
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{
                                            delay:
                                                wordIndex * 0.1 +
                                                letterIndex * 0.03,
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 25,
                                        }}
                                        className="inline-block text-transparent bg-clip-text 
                                        bg-gradient-to-r from-neutral-900 to-neutral-700/80 
                                        dark:from-white dark:to-white/80"
                                    >
                                        {letter}
                                    </motion.span>
                                ))}
                            </span>
                        ))}
                    </h1>

                    <div
                        className="inline-block group relative bg-gradient-to-b from-black/10 to-white/10 
                        dark:from-white/10 dark:to-black/10 p-px rounded-2xl backdrop-blur-lg 
                        overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
                    >
                        <Button
                            variant="ghost"
                            className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md 
                            bg-white/95 hover:bg-white/100 dark:bg-black/95 dark:hover:bg-black/100 
                            text-black dark:text-white transition-all duration-300 
                            group-hover:-translate-y-0.5 border border-black/10 dark:border-white/10
                            hover:shadow-md dark:hover:shadow-neutral-800/50"
                        >
                            <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                                Discover Excellence
                            </span>
                            <span
                                className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 
                                transition-all duration-300"
                            >
                                →
                            </span>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}


demo.tsx
import { BackgroundPaths } from "@/components/ui/background-paths"


export function DemoBackgroundPaths() {
    return <BackgroundPaths title="Background Paths" />
}
```

Copy-paste these files for dependencies:
```tsx
shadcn/button
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

```

Install NPM dependencies:
```bash
framer-motion, @radix-ui/react-slot, class-variance-authority
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them
"