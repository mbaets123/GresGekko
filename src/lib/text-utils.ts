/**
 * Shared text utilities for answer comparison in questions.
 */

export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/^(de|het|een)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:'"()-]/g, "");
}

export function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

/** Allow small typos: 1 char for short words, 2 for longer */
export function isCloseEnough(student: string, correct: string): boolean {
  const s = normalize(student);
  const c = normalize(correct);
  if (s === c) return true;
  const maxDist = c.length <= 6 ? 1 : 2;
  return levenshtein(s, c) <= maxDist;
}
