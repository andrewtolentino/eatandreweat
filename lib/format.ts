/** "12 March 2026" reads better in prose than "2026-03-12". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Parsed and formatted in UTC on purpose. `new Date("2026-03-12")` is UTC
  // midnight, which in any negative offset renders as the 11th — the write-up
  // would be dated the day before the meal for everyone west of Greenwich.
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
