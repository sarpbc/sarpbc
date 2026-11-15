<script lang="ts" setup>
import type { SelectOption } from "@sarpbc/design";
import type { Player } from "@sarpbc/types";
import { refDebounced } from "@vueuse/core";

const { player, label, excludedSlug } = defineProps<{
  player: Player | null;
  label: string;
  excludedSlug: string | null;
}>();

const emit = defineEmits<{
  select: [slug: string];
}>();

const { t } = useI18n();

const SEARCH_LIMIT = 8;

const searchTerm = ref("");

const query = refDebounced(
  computed(() => searchTerm.value.trim()),
  200,
);

const toOption = (candidate: Player): SelectOption<string> => ({
  description: candidate.team?.name,
  label: candidate.name,
  value: candidate.slug,
});

const selected = computed(() => (player ? toOption(player) : null));

const { data: results, status } = useLazyAsyncData(
  () => `player-compare-search-${query.value}`,
  async () => {
    if (!query.value) {
      return [];
    }

    const { players } = await getAllPlayers({ limit: SEARCH_LIMIT, search: query.value });

    return players;
  },
  { default: () => [], server: false },
);

/* Before any search, the list holds the current player so the field can name it. */
const items = computed(() => {
  if (!query.value) {
    return selected.value === null ? [] : [selected.value];
  }

  return (results.value ?? [])
    .filter((candidate) => candidate.slug !== excludedSlug)
    .map((candidate) => toOption(candidate));
});

const select = (slug: string | null) => {
  if (slug !== null) {
    emit("select", slug);
  }
};
</script>

<template>
  <SbFormField :label="label" class="w-full min-w-0">
    <SbCombobox
      v-model:search-term="searchTerm"
      :model-value="selected?.value ?? null"
      :items="items"
      remote
      :loading="status === 'pending'"
      icon="i-fluent-search-24-regular"
      :placeholder="t('page.player.compare.searchPlaceholder')"
      class="w-full"
      @update:model-value="select"
    >
      <template #empty>
        {{ query ? t("components.input.noResult") : t("page.player.compare.searchHint") }}
      </template>
    </SbCombobox>
  </SbFormField>
</template>
