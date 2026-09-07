<script lang="ts" setup>
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const toast = useToast();

const BRAND_BLUE = "#2B7FFF";
const BRAND_BLUE_RGB = "43, 127, 255";

setPageSeo({
  title: t("page.brand.title"),
  description: t("page.brand.metaDescription"),
});

async function copyHex(): Promise<void> {
  try {
    await navigator.clipboard.writeText(BRAND_BLUE);
    toast.add({ title: t("page.brand.hexCopied"), color: "success" });
  } catch {
    toast.add({ title: t("page.brand.hexCopyFailed"), color: "error" });
  }
}
</script>

<template>
  <article class="w-full max-w-3xl mx-auto">
    <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-highlighted mb-4">
      {{ $t("page.brand.title") }}
    </h1>
    <p class="text-base leading-relaxed text-muted">
      {{ $t("page.brand.intro") }}
    </p>

    <h2 class="text-xl font-semibold tracking-tight text-highlighted mt-16 mb-4">
      {{ $t("page.brand.nameTitle") }}
    </h2>
    <p class="text-base leading-relaxed text-muted">
      {{ $t("page.brand.nameBody") }}
    </p>

    <h2 class="text-xl font-semibold tracking-tight text-highlighted mt-16 mb-4">
      {{ $t("page.brand.usageTitle") }}
    </h2>
    <p class="text-base leading-relaxed text-muted mb-4">
      {{ $t("page.brand.usageSpace") }}
    </p>
    <p class="text-base leading-relaxed text-muted">
      {{ $t("page.brand.usageAlter", { hex: BRAND_BLUE }) }}
    </p>

    <h2 class="text-xl font-semibold tracking-tight text-highlighted mt-16 mb-4">
      {{ $t("page.brand.logoTitle") }}
    </h2>
    <p class="text-base leading-relaxed text-muted mb-6">
      {{ $t("page.brand.logoBody") }}
    </p>
    <div class="grid gap-px sm:grid-cols-2 border border-default bg-default">
      <div class="flex min-h-64 items-center justify-center bg-elevated">
        <img
          src="/sarpbc.svg"
          :alt="$t('page.brand.logoSvgAlt')"
          width="160"
          height="160"
          class="size-32 md:size-40"
        />
      </div>
      <div class="flex min-h-64 items-center justify-center bg-ink-950">
        <img
          src="/sarpbc.png"
          :alt="$t('page.brand.logoPngAlt')"
          width="160"
          height="160"
          class="size-32 md:size-40"
        />
      </div>
    </div>
    <div class="flex flex-wrap gap-3 mt-4">
      <UButton to="/sarpbc.svg" download="sarpbc.svg" external color="neutral" variant="outline">
        {{ $t("page.brand.downloadSvg") }}
      </UButton>
      <UButton to="/sarpbc.png" download="sarpbc.png" external color="neutral" variant="outline">
        {{ $t("page.brand.downloadPng") }}
      </UButton>
    </div>

    <h2 class="text-xl font-semibold tracking-tight text-highlighted mt-16 mb-4">
      {{ $t("page.brand.iconTitle") }}
    </h2>
    <p class="text-base leading-relaxed text-muted mb-6">
      {{ $t("page.brand.iconBody") }}
    </p>
    <div class="flex min-h-48 items-center justify-center border border-default bg-elevated">
      <img
        src="/favicon.ico"
        :alt="$t('page.brand.faviconAlt')"
        width="32"
        height="32"
        class="size-8"
      />
    </div>
    <div class="mt-4">
      <UButton to="/favicon.ico" download="favicon.ico" external color="neutral" variant="outline">
        {{ $t("page.brand.downloadIco") }}
      </UButton>
    </div>

    <h2 class="text-xl font-semibold tracking-tight text-highlighted mt-16 mb-4">
      {{ $t("page.brand.ogTitle") }}
    </h2>
    <p class="text-base leading-relaxed text-muted mb-6">
      {{ $t("page.brand.ogBody") }}
    </p>
    <div class="flex items-center justify-center border border-default bg-elevated p-6">
      <img
        src="/og-image.jpg"
        :alt="$t('page.brand.ogAlt')"
        width="1200"
        height="630"
        class="w-full max-w-md h-auto"
      />
    </div>
    <div class="mt-4">
      <UButton
        to="/og-image.jpg"
        download="og-image.jpg"
        external
        color="neutral"
        variant="outline"
      >
        {{ $t("page.brand.downloadJpg") }}
      </UButton>
    </div>

    <h2 class="text-xl font-semibold tracking-tight text-highlighted mt-16 mb-4">
      {{ $t("page.brand.colorTitle") }}
    </h2>
    <div class="border border-default">
      <div class="h-40" :style="{ backgroundColor: BRAND_BLUE }" />
      <div class="flex flex-col gap-1 p-4">
        <p class="text-sm font-medium text-highlighted">
          {{ $t("page.brand.colorName") }}
        </p>
        <p class="text-xs text-muted font-mono">
          {{ $t("page.brand.colorRgb", { value: BRAND_BLUE_RGB }) }}
        </p>
        <div class="flex items-center justify-between gap-3 min-h-10">
          <p class="text-xs text-muted font-mono" translate="no">{{ BRAND_BLUE }}</p>
          <UButton color="neutral" variant="ghost" size="sm" @click="copyHex">
            {{ $t("page.brand.copyHex") }}
          </UButton>
        </div>
      </div>
    </div>
  </article>
</template>
