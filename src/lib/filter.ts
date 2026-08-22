/**
 * Every whitespace-separated word in the query must appear somewhere in the
 * haystack, in any order. "hackathon iit" then matches a row whose searchable
 * text contains both words anywhere, not just the exact phrase -- the
 * plain single-substring test this replaced required the literal contiguous
 * phrase, which missed anything typed out of the row's own word order.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  return words.every((word) => haystack.includes(word));
}
