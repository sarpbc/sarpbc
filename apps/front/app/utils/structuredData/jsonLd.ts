export const SCHEMA_ORG = "https://schema.org";

export type JsonLdPrimitive = string | number | boolean;
export type JsonLdValue = JsonLdPrimitive | JsonLdNode | JsonLdValue[];

export interface JsonLdNode {
  "@context"?: string;
  "@type": string;
  "@id"?: string;
  [key: string]: JsonLdValue | undefined;
}

export function compactJsonLd<T extends JsonLdNode>(node: T): T {
  const result: JsonLdNode = { "@type": node["@type"] };

  for (const [key, value] of Object.entries(node)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}

export function serializeJsonLd(data: JsonLdNode): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}
