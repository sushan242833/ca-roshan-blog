import { SITE_NAME, SITE_URL } from "@/config/site.config";
import { htmlToPlainText } from "@/lib/format";

interface StructuredDataAuthor {
  name: string;
}

interface StructuredDataImage {
  url: string;
}

export interface ArticleSchemaInput {
  title: string;
  slug: string;
  excerpt?: string | null;
  metaDescription?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: StructuredDataAuthor | null;
  featuredImage?: StructuredDataImage | null;
}

export interface Breadcrumb {
  name: string;
  path: string;
}

// Google requires structured data to describe what is actually on the page.
// Every field below is rendered by ArticleView — headline, author byline,
// published and updated dates, the featured image — so nothing here is a claim
// the page does not visibly support. Fields we cannot honestly fill (ratings,
// prices, a publisher logo we do not have) are simply omitted.
export function buildArticleSchema(post: ArticleSchemaInput) {
  const url = `${SITE_URL}/blogs/${encodeURIComponent(post.slug)}`;
  const description =
    post.metaDescription ??
    (post.excerpt ? htmlToPlainText(post.excerpt) : undefined);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(description ? { description } : {}),
    // ArticleView displays both dates in the byline.
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.author?.name ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    // Only when the page actually shows one.
    ...(post.featuredImage?.url ? { image: [post.featuredImage.url] } : {}),
  };
}

// Mirrors the visible path a reader took to the article. Only emitted where the
// site really does present that hierarchy.
export function buildBreadcrumbSchema(crumbs: Breadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function serializeJsonLd(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}
