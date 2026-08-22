import { Home } from "@/components/Home";

export default function Page() {
  // Evaluated at build time, then handed to the client component so the
  // copyright year cannot drift out of sync between server and browser.
  return <Home year={new Date().getFullYear()} />;
}
