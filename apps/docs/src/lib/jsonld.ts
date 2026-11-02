/**
 * Schema.org JSON-LD for the site's pages. Pure builders that return plain
 * objects; `ldScript` serializes one for a `<script type="application/ld+json">`.
 */
import { links, site } from "../site.config.ts";

type Ld = Record<string, unknown>;

const abs = (path: string): string => new URL(path, site.url).href;

/** Author and publisher of the site and the kit. */
export const author: Ld = {
  "@type": "Person",
  name: "Derek Nelsen",
  url: "https://github.com/dereknelsen",
};

export function websiteLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${abs("/")}#website`,
    name: site.title,
    alternateName: site.name,
    description: site.description,
    url: abs("/"),
    inLanguage: "en",
    publisher: author,
  };
}

export function softwareLd(version: string): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "@zazz-ui/core",
    alternateName: site.title,
    description: site.description,
    url: abs("/"),
    codeRepository: links.github,
    license: links.license,
    programmingLanguage: ["CSS", "TypeScript", "HTML"],
    runtimePlatform: "Web browser",
    version,
    author,
    sameAs: [links.npm, links.github],
  };
}

export interface ArticleInput {
  title: string;
  description?: string;
  /** Site-relative path, e.g. `/docs/install/`. */
  url: string;
  /** Top-level area or sidebar group, e.g. `"Docs"`. */
  section: string;
}

export function articleLd({ title, description, url, section }: ArticleInput): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    ...(description && { description }),
    url: abs(url),
    mainEntityOfPage: abs(url),
    articleSection: section,
    inLanguage: "en",
    isPartOf: { "@id": `${abs("/")}#website` },
    author,
    publisher: author,
  };
}

export interface BlogPostingInput {
  title: string;
  description: string;
  url: string;
  date: Date;
  tags?: readonly string[];
  /** Absolute or site-relative URL of the social image. */
  image?: string;
}

export function blogPostingLd({
  title,
  description,
  url,
  date,
  tags = [],
  image,
}: BlogPostingInput): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: abs(url),
    mainEntityOfPage: abs(url),
    datePublished: date.toISOString(),
    ...(tags.length > 0 && { keywords: tags.join(", ") }),
    ...(image && { image: abs(image) }),
    inLanguage: "en",
    isPartOf: { "@id": `${abs("/")}#website` },
    author,
    publisher: author,
  };
}

/** A breadcrumb trail from the home page; the last item is the current page. */
export function breadcrumbLd(trail: readonly { name: string; url: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.url),
    })),
  };
}

/**
 * JSON for inlining in a `<script>`: `<` is escaped so content can never close
 * the element early (`</script>`) or open a comment.
 */
export function ldJson(obj: Ld): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
