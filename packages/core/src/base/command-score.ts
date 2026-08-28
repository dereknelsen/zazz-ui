"use strict";

/**
 * @fileoverview Fuzzy command-scoring for the typeahead family.
 * @description Rates how well a search query matches a candidate string,
 * returning 0 (no match) to 1 (perfect continuous match). Continuous runs and
 * word-boundary jumps score high; scattered character jumps, transpositions,
 * case mismatches, and skipped characters decay the score. Autocomplete,
 * combobox, and command all rank their items with this single function.
 *
 * Vendored from cmdk's `command-score.ts` by @pacocoursey (MIT), itself
 * adapted from Superhuman's `command-score` (MIT), which builds on Joshaven
 * Potter's `string_score`. The constants and recursion are kept verbatim so
 * results match cmdk's ranking; only the module shape is Zazz's.
 *
 * @see https://github.com/pacocoursey/cmdk
 * @see https://github.com/superhuman/command-score
 */

// --- Scoring constants ---

// The scores are arranged so that a continuous match of characters will
// result in a total score of 1.
//
// The best case: this character is a match, and either this is the start of
// the string or the previous character was also a match.
const SCORE_CONTINUE_MATCH = 1;
// A new match at the start of a word scores better than a new match
// elsewhere, as it's more likely that the user will type the starts of
// fragments. Word jumps between spaces score slightly higher than slashes,
// brackets, hyphens, etc.
const SCORE_SPACE_WORD_JUMP = 0.9;
const SCORE_NON_SPACE_WORD_JUMP = 0.8;
// Any other match isn't ideal, but is included for completeness.
const SCORE_CHARACTER_JUMP = 0.17;
// If the user transposed two letters, it should be significantly penalized:
// "ouch" is more likely than "curtain" when "uc" is typed.
const SCORE_TRANSPOSITION = 0.1;
// The goodness of a match decays slightly with each skipped character:
// "bad" is more likely than "bard" when "bd" is typed.
const PENALTY_SKIPPED = 0.999;
// An exact-case match beats a case-insensitive match by a small amount:
// "HTML" is more likely than "haml" when "HM" is typed.
const PENALTY_CASE_MISMATCH = 0.9999;
// If the candidate has more characters than the user typed, penalize
// slightly: "html" is more likely than "html5" when "html" is typed.
const PENALTY_NOT_COMPLETE = 0.99;

const IS_GAP_REGEXP = /[\\/_+.#"@[({&]/;
const COUNT_GAPS_REGEXP = /[\\/_+.#"@[({&]/g;
const IS_SPACE_REGEXP = /[\s-]/;
const COUNT_SPACE_REGEXP = /[\s-]/g;

// --- Scoring ---

/**
 * @description Recursive scorer over (candidate index, query index) pairs,
 * memoized per pair so repeated subproblems resolve in constant time.
 *
 * @param target - The candidate string (original casing).
 * @param query - The query string (original casing).
 * @param lowerTarget - Pre-lowercased candidate.
 * @param lowerQuery - Pre-lowercased query.
 * @param targetIndex - Current position in the candidate.
 * @param queryIndex - Current position in the query.
 * @param memo - Shared memoization table for this scoring run.
 * @returns The best score reachable from this position.
 * @private
 */
function commandScoreInner(
  target: string,
  query: string,
  lowerTarget: string,
  lowerQuery: string,
  targetIndex: number,
  queryIndex: number,
  memo: Record<string, number>,
): number {
  if (queryIndex === query.length) {
    if (targetIndex === target.length) {
      return SCORE_CONTINUE_MATCH;
    }
    return PENALTY_NOT_COMPLETE;
  }

  const memoKey = `${targetIndex},${queryIndex}`;
  const memoized = memo[memoKey];
  if (memoized !== undefined) {
    return memoized;
  }

  const queryChar = lowerQuery.charAt(queryIndex);
  let index = lowerTarget.indexOf(queryChar, targetIndex);
  let highScore = 0;

  while (index >= 0) {
    let score = commandScoreInner(
      target,
      query,
      lowerTarget,
      lowerQuery,
      index + 1,
      queryIndex + 1,
      memo,
    );
    if (score > highScore) {
      if (index === targetIndex) {
        score *= SCORE_CONTINUE_MATCH;
      } else if (IS_GAP_REGEXP.test(target.charAt(index - 1))) {
        score *= SCORE_NON_SPACE_WORD_JUMP;
        const wordBreaks = target.slice(targetIndex, index - 1).match(COUNT_GAPS_REGEXP);
        if (wordBreaks && targetIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, wordBreaks.length);
        }
      } else if (IS_SPACE_REGEXP.test(target.charAt(index - 1))) {
        score *= SCORE_SPACE_WORD_JUMP;
        const spaceBreaks = target.slice(targetIndex, index - 1).match(COUNT_SPACE_REGEXP);
        if (spaceBreaks && targetIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, spaceBreaks.length);
        }
      } else {
        score *= SCORE_CHARACTER_JUMP;
        if (targetIndex > 0) {
          score *= Math.pow(PENALTY_SKIPPED, index - targetIndex);
        }
      }

      if (target.charAt(index) !== query.charAt(queryIndex)) {
        score *= PENALTY_CASE_MISMATCH;
      }
    }

    if (
      (score < SCORE_TRANSPOSITION &&
        lowerTarget.charAt(index - 1) === lowerQuery.charAt(queryIndex + 1)) ||
      // Allow duplicate letters (cmdk ref #7428)
      (lowerQuery.charAt(queryIndex + 1) === lowerQuery.charAt(queryIndex) &&
        lowerTarget.charAt(index - 1) !== lowerQuery.charAt(queryIndex))
    ) {
      const transposedScore = commandScoreInner(
        target,
        query,
        lowerTarget,
        lowerQuery,
        index + 1,
        queryIndex + 2,
        memo,
      );

      if (transposedScore * SCORE_TRANSPOSITION > score) {
        score = transposedScore * SCORE_TRANSPOSITION;
      }
    }

    if (score > highScore) {
      highScore = score;
    }

    index = lowerTarget.indexOf(queryChar, index + 1);
  }

  memo[memoKey] = highScore;
  return highScore;
}

/**
 * @description Lowercases a string and folds every space-like character to a
 * plain space so variants match each other.
 *
 * @param value - The string to normalize.
 * @returns The normalized string.
 * @private
 */
function formatInput(value: string): string {
  return value.toLowerCase().replace(COUNT_SPACE_REGEXP, " ");
}

/**
 * @description Scores how well `query` matches `target`, optionally widening
 * the candidate with alias strings (extra keywords that should also match).
 *
 * @param target - The candidate string to score against.
 * @param query - What the user typed.
 * @param aliases - Extra match targets appended to the candidate.
 * @returns 0 (no match) to 1 (perfect continuous match).
 */
function commandScore(target: string, query: string, aliases: readonly string[] = []): number {
  const haystack = aliases.length > 0 ? `${target} ${aliases.join(" ")}` : target;
  return commandScoreInner(haystack, query, formatInput(haystack), formatInput(query), 0, 0, {});
}

export { commandScore };
