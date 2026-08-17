import type { MaybeRefOrGetter } from "vue";
import { compactJsonLd, serializeJsonLd, type JsonLdNode } from "~/utils/structuredData/jsonLd";

export function useStructuredData() {
  const setJsonLd = (key: string, data: MaybeRefOrGetter<JsonLdNode | null | undefined>) => {
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
  };

  return { setJsonLd };
}
