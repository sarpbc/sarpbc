<script setup lang="ts">
import type { CollectionQueryBuilder, Collections } from "@nuxt/content";

type LegalPage = Collections["legal"];

const props = defineProps<{
  slug: string;
}>();

const { locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const localeCode = computed(() => (locale.value === "fr" ? "fr" : "en"));

const queryLegalCollection = queryCollection as (
  collection: "legal",
) => CollectionQueryBuilder<LegalPage>;

const { data: doc } = await useAsyncData<LegalPage | null>(
  () => `legal-${props.slug}-${localeCode.value}`,
  () => queryLegalCollection("legal").path(`/legal/${localeCode.value}/${props.slug}`).first(),
  { watch: [localeCode] },
);

watch(
  doc,
  (value) => {
    if (!value) {
      return;
    }

    setPageSeo({
      title: value.title,
      description: value.description,
    });
  },
  { immediate: true },
);
</script>

<template>
  <div class="w-full flex flex-col">
    <h1
      class="flex text-xl font-semibold h-16 justify-center items-center md:justify-start md:items-start"
    >
      {{ doc?.title }}
    </h1>

    <div class="w-full flex flex-col gap-4">
      <div v-if="doc" class="border border-default p-2 md:p-4">
        <ContentRenderer
          :value="doc"
          class="legal-prose text-muted [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-highlighted [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:first:mt-0 [&_h3]:font-medium [&_h3]:text-highlighted [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:mb-3 [&_a]:text-highlighted [&_a]:hover:text-primary [&_a]:font-medium [&_strong]:text-highlighted [&_em]:not-italic [&_em]:block [&_em]:mb-6"
        />
      </div>
      <div v-else class="border border-default p-4 text-muted">
        {{ $t("components.legal.notFound") }}
      </div>
    </div>
  </div>
</template>
