/**
 * Computes Sørensen-Dice Coefficient similarity score between two strings.
 * Normalized strings remove non-alphanumeric characters, extra whitespace, and are lowercased.
 * Returns a score between 0.0 (totally different) and 1.0 (exact match / normalized match).
 */
export function getSimilarityScore(str1: string, str2: string): number {
  if (!str1 || !str2) return 0.0;

  // Clean strings: lowercased, remove non-alphanumeric, remove extra spacing
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  // Generate bigrams for s1
  const s1Bigrams = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substring(i, i + 2);
    const count = s1Bigrams.get(bigram) || 0;
    s1Bigrams.set(bigram, count + 1);
  }

  // Intersect bigrams with s2
  let intersectionSize = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2);
    const count = s1Bigrams.get(bigram) || 0;
    if (count > 0) {
      intersectionSize++;
      s1Bigrams.set(bigram, count - 1);
    }
  }

  // Sørensen-Dice formula
  return (2.0 * intersectionSize) / (s1.length + s2.length - 2);
}

/**
 * Returns duplicate confidence level based on score boundaries:
 * - HIGH: score >= 0.85
 * - MEDIUM: score >= 0.60
 * - LOW: score < 0.60
 */
export function getConfidenceLevel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 0.85) return 'HIGH';
  if (score >= 0.60) return 'MEDIUM';
  return 'LOW';
}
