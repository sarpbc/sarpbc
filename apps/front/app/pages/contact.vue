<script lang="ts" setup>
const { locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const localeCode = computed(() => (locale.value === "fr" ? "fr" : "en"));

const { data: doc } = await useAsyncData(
  "contact",
  () => queryCollection("contact").path(`/contact/${localeCode.value}`).first(),
  { watch: [localeCode] },
);

watch(
  doc,
  (value) => {
    if (value) {
      setPageSeo({
        title: value.title,
        description: value.description,
      });
    }
  },
  { immediate: true },
);
</script>

<template>
  <article v-if="doc" class="w-full max-w-3xl mx-auto">
    <ContentRenderer
      :value="doc"
      class="contact-prose text-muted [&_h1]:text-3xl [&_h1]:md:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-highlighted [&_h1]:mb-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-highlighted [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-highlighted [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-4 [&_hr]:border-default [&_hr]:my-12 [&_em]:italic [&_strong]:text-highlighted"
    />
  </article>

  <div v-else class="border border-default p-4 text-muted">
    {{ $t("components.legal.notFound") }}
  </div>
</template>
