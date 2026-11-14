import { SITE_ORIGIN } from "@sarpbc/ui/config";
import { compactJsonLd, SCHEMA_ORG } from "./json-ld";
import type { JsonLdNode } from "./json-ld";

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

export interface ContactPointLd extends JsonLdNode {
  "@type": "ContactPoint";
  email: string;
  contactType: string;
  url: string;
}

export interface OrganizationLd extends JsonLdNode {
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  logo: string;
  email: string;
  sameAs: string[];
  contactPoint: ContactPointLd[];
}

export interface BuildOrganizationOptions {
  contactPagePath?: string;
}

export function buildOrganization(options: BuildOrganizationOptions = {}): OrganizationLd {
  const contactPagePath = options.contactPagePath ?? "/contact";

  return compactJsonLd({
    "@context": SCHEMA_ORG,
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "sarpbc.org",
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/sarpbc.svg`,
    email: "contact@sarpbc.org",
    sameAs: ["https://x.com/SARPBCorg"],
    contactPoint: [
      compactJsonLd({
        "@type": "ContactPoint",
        email: "contact@sarpbc.org",
        contactType: "customer support",
        url: `${SITE_ORIGIN}${contactPagePath}`,
      }),
    ],
  });
}
