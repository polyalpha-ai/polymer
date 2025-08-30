import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">Not financial advice.</span>
            <span className="hidden sm:inline">•</span>
            <Link href="/terms" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              Terms
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
              Contact
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link
              href="https://twitter.com/polyseer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link
              href="https://github.com/polyseer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}