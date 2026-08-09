<script lang="ts" setup>
import CareerEnd from "~/components/career/CareerEnd.vue";
import { decodeCareerResultFromShare, loadCareerResult } from "~/composables/useCareerStorage";
import type { CareerResult } from "~/types/career";

const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const localePath = useLocalePath();
const route = useRoute();

const careerId = computed(() => String(route.params.id ?? ""));
const result = ref<CareerResult | null>(null);
const loaded = ref(false);

onMounted(() => {
  const fromStorage = loadCareerResult(careerId.value);
  if (fromStorage) {
    result.value = fromStorage;
    loaded.value = true;
    return;
  }

  const encoded = typeof route.query.d === "string" ? route.query.d : null;
  if (encoded) {
    result.value = decodeCareerResultFromShare(encoded);
  }
  loaded.value = true;
});

const pageTitle = computed(() =>
  result.value
    ? `${result.value.playerName} — ${t("page.game.career.title")}`
    : t("page.game.career.share.notFound"),
);

watchEffect(() => {
  setPageSeo({
    title: pageTitle.value,
    description: t("page.game.career.seo.description"),
  });
});
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <SCrossCard class="min-h-row-header">
      <div class="flex w-full items-center justify-center py-3 text-center">
        <h1 class="text-xl font-semibold tracking-tight">
          {{ t("page.game.career.title") }}
        </h1>
      </div>
    </SCrossCard>

    <SCard v-if="!loaded" class="p-6">
      <USkeleton class="h-32 w-full" />
    </SCard>

    <SCard v-else-if="result" class="p-4 sm:p-6">
      <CareerEnd :result="result" shared />
    </SCard>

    <SCard v-else class="p-6">
      <div class="flex flex-col items-center gap-4 text-center">
        <UIcon name="i-fluent-warning-24-regular" class="size-8 text-muted" />
        <div class="space-y-2">
          <p class="text-lg font-semibold">{{ t("page.game.career.share.notFound") }}</p>
          <p class="text-sm text-muted text-pretty">
            {{ t("page.game.career.share.notFoundBody") }}
          </p>
        </div>
        <UButton :to="localePath('/game/career')">
          {{ t("page.game.career.share.startOwn") }}
        </UButton>
      </div>
    </SCard>
  </section>
</template>
