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

export const buildOrganization = (options: BuildOrganizationOptions = {}): OrganizationLd => {
  const contactPagePath = options.contactPagePath ?? "/contact";

  return compactJsonLd({
    "@context": SCHEMA_ORG,
    "@id": ORGANIZATION_ID,
    "@type": "Organization",
    contactPoint: [
      compactJsonLd({
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "contact@sarpbc.org",
        url: `${SITE_ORIGIN}${contactPagePath}`,
      }),
    ],
    email: "contact@sarpbc.org",
    logo: `${SITE_ORIGIN}/sarpbc.svg`,
    name: "sarpbc.org",
    sameAs: ["https://x.com/SARPBCorg"],
    url: SITE_ORIGIN,
  });
};
