/**
 * Text normalization utilities for consistent string comparison
 */

/**
 * Normalizes text for comparison by:
 * - Converting to lowercase
 * - Replacing ligatures (œ, æ)
 * - Removing diacritics
 * - Collapsing whitespace
 * - Removing punctuation
 *
 * @param value - Text to normalize
 * @returns Normalized text suitable for fuzzy matching
 *
 * @example
 * ```ts
 * normalize('Église Notre-Dame de Paris')
 * // => 'eglise notre dame de paris'
 * ```
 */
export function normalize(value?: string | null): string {
  if (!value) {
    return '';
  }

  return value
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Normalizes phone number by removing all non-digit characters except leading +
 *
 * @param value - Phone number to normalize
 * @returns Normalized phone number (e.g., "+33142345678")
 *
 * @example
 * ```ts
 * normalizePhone('+33 1 42 34 56 78')
 * // => '+33142345678'
 *
 * normalizePhone('01 42 34 56 78')
 * // => '0142345678'
 * ```
 */
export function normalizePhone(value?: string | null): string {
  if (!value) {
    return '';
  }

  const cleaned = value.replace(/[^+\d]/g, '');

  // Ensure + is only at the beginning
  if (cleaned.includes('+')) {
    const parts = cleaned.split('+');
    return '+' + parts.filter(Boolean).join('');
  }

  return cleaned;
}

/**
 * Extracts hostname from URL without www prefix
 *
 * @param url - URL to parse
 * @returns Hostname without www (e.g., "example.com")
 *
 * @example
 * ```ts
 * getHostname('https://www.example.com/path')
 * // => 'example.com'
 * ```
 */
export function getHostname(url?: string | null): string {
  if (!url) {
    return '';
  }

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Fuzzy string matching with configurable threshold
 *
 * @param a - First string
 * @param b - Second string
 * @param threshold - Similarity threshold (0-1), defaults to 0.8
 * @returns True if strings are similar enough
 *
 * @example
 * ```ts
 * fuzzyMatch('Notre Dame de Paris', 'Notre-Dame de Paris')
 * // => true
 *
 * fuzzyMatch('Saint Pierre', 'Sacré Coeur')
 * // => false
 * ```
 */
export function fuzzyMatch(
  a: string,
  b: string,
  threshold: number = 0.8
): boolean {
  const normA = normalize(a);
  const normB = normalize(b);

  if (!normA || !normB) {
    return false;
  }

  // Exact match after normalization
  if (normA === normB) {
    return true;
  }

  // Substring match
  if (normA.includes(normB) || normB.includes(normA)) {
    return true;
  }

  // Levenshtein-based similarity
  const similarity = calculateSimilarity(normA, normB);
  return similarity >= threshold;
}

/**
 * Calculates string similarity using Levenshtein distance
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (0-1), where 1 is identical
 */
function calculateSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Computes Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Safely parses a float from a string, handling commas and various formats
 *
 * @param raw - Raw string to parse
 * @returns Parsed float or undefined if invalid
 *
 * @example
 * ```ts
 * parseFloatSafe('4,8')
 * // => 4.8
 *
 * parseFloatSafe('invalid')
 * // => undefined
 * ```
 */
export function parseFloatSafe(raw?: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) {
    return undefined;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Safely parses an integer from a string, stripping all non-digit characters
 *
 * @param raw - Raw string to parse
 * @returns Parsed integer or undefined if invalid
 *
 * @example
 * ```ts
 * parseIntSafe('57 420 avis')
 * // => 57420
 * ```
 */
export function parseIntSafe(raw?: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) {
    return undefined;
  }

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Truncates text to max length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default 100)
 * @returns Truncated text with ellipsis if needed
 */
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}
