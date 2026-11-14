import { SCHEMA_ORG, compactJsonLd } from "./json-ld";
import type { JsonLdNode } from "./json-ld";

export interface FaqPageItem {
  question: string;
  answer: string;
}

export interface FaqPageLd extends JsonLdNode {
  "@type": "FAQPage";
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }[];
}

export const buildFaqPage = (items: FaqPageItem[]): FaqPageLd =>
  compactJsonLd({
    "@context": SCHEMA_ORG,
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });
