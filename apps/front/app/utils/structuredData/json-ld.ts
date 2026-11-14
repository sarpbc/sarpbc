export const SCHEMA_ORG = "https://schema.org";

export type JsonLdPrimitive = string | number | boolean;

export interface JsonLdReference {
  "@id": string;
}

export type JsonLdValue = JsonLdPrimitive | JsonLdNode | JsonLdReference | JsonLdValue[];

export interface JsonLdNode {
  "@context"?: string;
  "@type": string;
  "@id"?: string;
  [key: string]: JsonLdValue | undefined;
}

export const compactJsonLd = <T extends JsonLdNode>(node: T): T => {
  const result = { ...node };

  for (const [key, value] of Object.entries(node)) {
    if (value === undefined) {
      Reflect.deleteProperty(result, key);
    }
  }

  return result;
};

export const serializeJsonLd = (data: JsonLdNode): string =>
  JSON.stringify(data).replaceAll("<", "\\u003c");
