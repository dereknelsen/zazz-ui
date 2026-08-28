"use strict";

/**
 * @fileoverview Data attribute and value parsing utilities.
 * @description Shared helpers for converting HTML data-attribute strings into
 * typed JavaScript values.
 *
 * This is a **public, consumer-facing** surface (`window.Utils`, documented at
 * /docs/components/utils), not just kit plumbing: data-attribute configuration
 * is the kit's documented pattern for authoring a component
 * (CONVENTIONS.scripts.md), so anyone writing a component in the Zazz idiom
 * needs this exact parser to match kit behaviour. Keep it here rather than
 * folding it into a caller — see docs/adr/0004-keep-utils-public.md.
 *
 * Callers that need a typed result should wrap it at their own boundary (see
 * `readCarouselOptions` in embla.ts) rather than narrowing at each call.
 */

// --- Data type conversion ---

/**
 * @description Converts string values to their appropriate JavaScript types.
 *
 * @param value - The string value to convert.
 * @returns Converted value in the appropriate type.
 *
 * @example
 * parseValue("true"); // true
 * parseValue("42"); // 42
 * parseValue("[1,2,3]"); // [1, 2, 3]
 * parseValue("hello"); // "hello"
 */
function parseValue(value: string): boolean | number | unknown[] | string {
  if (value === "true") return true;
  if (value === "false") return false;

  if (!Number.isNaN(Number(value)) && value.trim() !== "") return Number(value);

  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

// --- Data attribute parsing ---

/**
 * @description Extracts and parses data attributes with a specific prefix from a DOM node.
 *
 * Converts kebab-case attribute names to camelCase object keys.
 *
 * @param node - The DOM element to extract attributes from.
 * @param prefix - The attribute prefix to look for (e.g. `"data-carousel-"`).
 * @returns Object with camelCase keys and parsed values.
 *
 * @example
 * // <div data-carousel-auto-play="true" data-carousel-slide-count="5">
 * parseDataAttributes(element, "data-carousel-");
 * // { autoPlay: true, slideCount: 5 }
 */
const parseDataAttributes = (node: Element, prefix: string): Record<string, unknown> => {
  const options: Record<string, unknown> = {};

  for (const attr of node.attributes) {
    if (attr.name.startsWith(prefix)) {
      const key = attr.name.replace(prefix, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());

      options[key] = parseValue(attr.value);
    }
  }

  return options;
};

/**
 * @namespace Utils
 * @description Shared DOM and data-attribute parsing utilities.
 *
 * @property parseValue - Converts string values to typed values.
 * @property parseDataAttributes - Parses prefixed data attributes on a node.
 */
const Utils = {
  parseValue,
  parseDataAttributes,
};

// Attach to window for the documented public API (`window.Utils`), and export
// for module consumers (embla.js imports it via the main.js bundle).
if (typeof window !== "undefined") {
  window.Utils = Utils;
}

export { Utils };
