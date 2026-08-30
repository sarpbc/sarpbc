import { SCHEMA_ORG, compactJsonLd, type JsonLdNode } from "./jsonLd";

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

export function buildFaqPage(items: FaqPageItem[]): FaqPageLd {
  return compactJsonLd({
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
}
