/**
 * @fileoverview The html-eslint AST nodes Zazz tooling reads, and lookups over
 * them. Ranges are source offsets; an attribute value's range excludes its quotes.
 */

export interface Ranged {
  range: [number, number];
}

export interface Attribute extends Ranged {
  /**
   * Missing when the name is not markup: a stray `="x"`, or a template expression
   * masked out of the name (Razor's `@onclick="Save"`). `parseHtml` drops those;
   * the ESLint AST keeps them, so readers outside it go through `namedAttributes`.
   */
  key?: Ranged & { value: string };
  value?: Ranged & { value: string };
}

export interface BaseNode extends Ranged {
  type: string;
  children?: Node[];
  /** Set by ESLint's traversal, or by {@link parseHtml}. */
  parent?: Node;
}

export interface Tag extends BaseNode {
  type: "Tag";
  name: string;
  attributes: Attribute[];
}

export interface Comment extends BaseNode {
  type: "Comment";
  value?: { value: string } & Ranged;
}

export type Node = Tag | Comment | BaseNode;

export function isTag(node: unknown): node is Tag {
  return (node as { type?: string } | undefined)?.type === "Tag";
}

export type NamedAttribute = Attribute & { key: NonNullable<Attribute["key"]> };

/** A tag's attributes that have a name (see `Attribute.key`). */
export function namedAttributes(tag: Tag): NamedAttribute[] {
  return tag.attributes.filter((attribute): attribute is NamedAttribute => !!attribute.key);
}

/** The first attribute named `name`, as the DOM resolves duplicates. */
export function attributeOf(tag: Tag, name: string): NamedAttribute | undefined {
  return namedAttributes(tag).find((attribute) => attribute.key.value.toLowerCase() === name);
}

/** An attribute's value as the DOM reads it: `""` when present without one, `null` when absent. */
export function valueOf(tag: Tag, name: string): string | null {
  const attribute = attributeOf(tag, name);
  return attribute ? (attribute.value?.value ?? "") : null;
}

/** `tag` and its ancestor tags, innermost first. */
export function* selfAndAncestors(tag: Tag): Generator<Tag> {
  for (let node: unknown = tag; isTag(node); node = node.parent) yield node;
}
