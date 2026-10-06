/**
 * @description Scores how well `query` matches `target`, optionally widening
 * the candidate with alias strings (extra keywords that should also match).
 *
 * @param target - The candidate string to score against.
 * @param query - What the user typed.
 * @param aliases - Extra match targets appended to the candidate.
 * @returns 0 (no match) to 1 (perfect continuous match).
 */
declare function commandScore(target: string, query: string, aliases?: readonly string[]): number;
export { commandScore };
//# sourceMappingURL=command-score.d.ts.map
