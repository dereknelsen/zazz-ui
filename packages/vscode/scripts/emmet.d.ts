/**
 * @fileoverview Types for `emmet` (its package exports carry none under
 * `nodenext`): the one call the Emmet snippet tests make.
 */

declare module "emmet" {
  export default function expand(abbreviation: string, config?: Record<string, unknown>): string;
}
