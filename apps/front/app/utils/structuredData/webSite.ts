import { SITE_ORIGIN } from "@sarpbc/ui/config";
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
  description: string;
  inLanguage?: string[];
}

export function buildWebSite(options: BuildWebSiteOptions): WebSiteLd {
  return compactJsonLd<WebSiteLd>({
    "@context": SCHEMA_ORG,
    "@type": "WebSite",
    name: "sarpbc.org",
    url: SITE_ORIGIN,
    description: options.description,
    inLanguage: options.inLanguage ?? ["en", "fr"],
    publisher: {
      "@id": ORGANIZATION_ID,
    },
  });
}
