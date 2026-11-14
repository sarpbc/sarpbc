import type { MaybeRefOrGetter } from "vue";
import { compactJsonLd, serializeJsonLd } from "~/utils/structuredData/json-ld";
import type { JsonLdNode } from "~/utils/structuredData/json-ld";

function setJsonLd(key: string, data: MaybeRefOrGetter<JsonLdNode | null | undefined>): void {
  useHead({
    script: computed(() => {
      const payload = toValue(data);

      if (!payload) {
        return [];
      }

      return [
        {
          key,
          type: "application/ld+json",
          innerHTML: serializeJsonLd(compactJsonLd(payload)),
        },
      ];
    }),
  });
}

export function useStructuredData() {
  return { setJsonLd };
}
