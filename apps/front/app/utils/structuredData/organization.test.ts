import { describe, expect, it } from "vitest";
import { buildOrganization, ORGANIZATION_ID } from "./organization";
import { SCHEMA_ORG } from "./jsonLd";

describe("buildOrganization", () => {
  it("includes required identity and contact fields", () => {
    const org = buildOrganization();

    expect(org["@context"]).toBe(SCHEMA_ORG);
    expect(org["@type"]).toBe("Organization");
    expect(org["@id"]).toBe(ORGANIZATION_ID);
    expect(org.name).toBe("sarpbc.org");
    expect("alternateName" in org).toBe(false);
    expect(org.url).toBe("https://sarpbc.org");
    expect(org.logo).toBe("https://sarpbc.org/sarpbc.svg");
    expect(org.email).toBe("contact@sarpbc.org");
    expect(org.sameAs).toEqual(["https://x.com/SARPBCorg"]);
  });

  it("includes email contactPoint without invented address or phone", () => {
    const org = buildOrganization();
    const [contactPoint] = org.contactPoint;

    expect(contactPoint["@type"]).toBe("ContactPoint");
    expect(contactPoint.email).toBe("contact@sarpbc.org");
    expect(contactPoint.contactType).toBe("customer support");
    expect(contactPoint.url).toBe("https://sarpbc.org/contact");
    expect("telephone" in contactPoint).toBe(false);
    expect("address" in org).toBe(false);
  });
});
