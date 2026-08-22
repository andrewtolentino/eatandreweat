"use client";

import { SignIn } from "./SignIn";
import { Credit } from "./Credit";

/**
 * Sign-in lives down here rather than in the header.
 *
 * Exactly one person ever needs it, and everyone else is a reader — a login
 * control at the top of the page is prominent chrome serving one visitor a
 * fortnight. At the foot it is findable and out of the way, which is the right
 * weight for it.
 */
export function SiteFooter({ year }: { year: number }) {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="flex flex-col gap-3 px-6 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
        <Credit year={year} />
        <div className="sm:w-44">
          <SignIn />
        </div>
      </div>
    </footer>
  );
}
