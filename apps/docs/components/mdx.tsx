import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { BandDiagram, BandFlowDiagram } from "./band-diagram";
import { HeadSnippet } from "./head-snippet";
import { Preview } from "./preview";
import { TemplateFrame } from "./template-frame";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Preview,
    HeadSnippet,
    TemplateFrame,
    BandDiagram,
    BandFlowDiagram,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
