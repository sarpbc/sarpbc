import { SITE_ORIGIN } from "@sarpbc/ui/config";
import { compactJsonLd, SCHEMA_ORG } from "./json-ld";
import type { JsonLdNode } from "./json-ld";
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

export const buildWebSite = (options: BuildWebSiteOptions): WebSiteLd =>
  compactJsonLd<WebSiteLd>({
    "@context": SCHEMA_ORG,
    "@type": "WebSite",
    description: options.description,
    inLanguage: options.inLanguage ?? ["en", "fr"],
    name: "sarpbc.org",
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    url: SITE_ORIGIN,
  });
