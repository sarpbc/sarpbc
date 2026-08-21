import { SITE_ORIGIN } from "~/utils/calendar/ics";
import { compactJsonLd, SCHEMA_ORG, type JsonLdNode } from "./jsonLd";
import { ORGANIZATION_ID } from "./organization";

export interface WebSiteLd extends JsonLdNode {
  "@type": "WebSite";
  name: string;
  url: string;
  description: string;
  inLanguage: string[];
  publisher: { "@id": string };
}

export interface BuildWebSiteOptions {
  origin?: string;
  description: string;
  inLanguage?: string[];
}

export function buildWebSite(options: BuildWebSiteOptions): WebSiteLd {
  const origin = options.origin ?? SITE_ORIGIN;

  return compactJsonLd({
    "@context": SCHEMA_ORG,
    "@type": "WebSite",
    name: "sarpbc.org",
    url: origin,
    description: options.description,
    inLanguage: options.inLanguage ?? ["en", "fr"],
    publisher: {
      "@id": ORGANIZATION_ID,
    },
  });
}
