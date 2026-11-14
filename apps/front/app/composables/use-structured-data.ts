import type { MaybeRefOrGetter } from "vue";
import { compactJsonLd, serializeJsonLd } from "~/utils/structuredData/json-ld";
import type { JsonLdNode } from "~/utils/structuredData/json-ld";

const setJsonLd = (key: string, data: MaybeRefOrGetter<JsonLdNode | null | undefined>): void => {
  useHead({
    script: computed(() => {
      const payload = toValue(data);

      if (!payload) {
        return [];
      }

      return [
        {
          innerHTML: serializeJsonLd(compactJsonLd(payload)),
          key,
          type: "application/ld+json",
        },
      ];
    }),
  });
};

export const useStructuredData = () => ({ setJsonLd });
