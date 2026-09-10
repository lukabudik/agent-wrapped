import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { appUrl, REPO_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: `${SITE_NAME} — your year in AI coding agents`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  openGraph: { siteName: SITE_NAME, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="border-b border-edge">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
            <Link href="/" className="font-mono text-sm font-semibold tracking-tight">
              <span className="text-coral">agent</span>
              <span className="text-dim">-wrapped</span>
            </Link>
            <div className="flex items-center gap-5 text-sm text-dim">
              <Link href="/leaderboard" className="transition-colors hover:text-ink">
                Leaderboard
              </Link>
              <a
                href={REPO_URL}
                className="transition-colors hover:text-ink"
                target="_blank"
                rel="noreferrer noopener"
              >
                GitHub
              </a>
            </div>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-edge">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-8 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
            <p>
              Aggregates only. Prompts, file paths and repository names never leave your machine.
            </p>
            <p>
              MIT licensed ·{" "}
              <a
                href={REPO_URL}
                className="text-dim transition-colors hover:text-ink"
                target="_blank"
                rel="noreferrer noopener"
              >
                source
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
