import { SITE_ORIGIN } from "~/utils/calendar/ics";
import { compactJsonLd, SCHEMA_ORG, type JsonLdNode } from "./jsonLd";

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
  origin?: string;
  contactPagePath?: string;
}

export function buildOrganization(options: BuildOrganizationOptions = {}): OrganizationLd {
  const origin = options.origin ?? SITE_ORIGIN;
  const contactPagePath = options.contactPagePath ?? "/contact";

  return compactJsonLd({
    "@context": SCHEMA_ORG,
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "sarpbc.org",
    url: origin,
    logo: `${origin}/sarpbc.svg`,
    email: "contact@sarpbc.org",
    sameAs: ["https://x.com/SARPBCorg"],
    contactPoint: [
      compactJsonLd({
        "@type": "ContactPoint",
        email: "contact@sarpbc.org",
        contactType: "customer support",
        url: `${origin}${contactPagePath}`,
      }),
    ],
  });
}
