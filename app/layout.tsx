import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/**
 * Headlines only, and only the one weight the interface actually sets. The
 * family ships seven; loading the six nothing references would be ~160KB of
 * woff2 downloaded to be ignored. Adding another back is one line.
 *
 * woff2 only, for the same reason: every browser that can run this app supports
 * it, so the .woff siblings in /fonts are dead weight on the wire.
 */
const motley = localFont({
  variable: "--font-motley",
  display: "swap",
  src: [{ path: "../fonts/Motley-Medium.woff2", weight: "500", style: "normal" }],
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${motley.variable} antialiased`}
    >
      {/* The page scrolls now. The old full-bleed map pinned the document and
          forbade scrolling entirely; with the feed as the main column that has
          to be undone, or the feed would be trapped in a viewport-height box. */}
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
