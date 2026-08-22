import { SITE_NAME } from "@/lib/site";

/**
 * The year is passed in from the server component rather than read from the
 * browser clock. This page is prerendered at build time, so computing it here
 * would bake in the build year and then disagree with the client after New
 * Year — a hydration mismatch over something nobody would think to test.
 */
export function Credit({ year }: { year: number }) {
  return (
    <p className="text-[11px] leading-relaxed text-muted">
      © {year} {SITE_NAME} · Built by{" "}
      <a
        href="https://andrewtolentino.com"
        target="_blank"
        rel="noreferrer noopener"
        className="underline underline-offset-2 hover:text-foreground"
      >
        Andrew Tolentino
      </a>
    </p>
  );
}
