<script lang="ts" setup>
import type { Player } from "@sarpbc/types";
import { refDebounced } from "@vueuse/core";

interface PlayerOption {
  label: string;
  description?: string;
  value: string;
}

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

function toOption(candidate: Player): PlayerOption {
  return { label: candidate.name, description: candidate.team?.name, value: candidate.slug };
}

const selected = computed(() => (player ? toOption(player) : undefined));

const { data: results, status } = useLazyAsyncData(
  () => `player-compare-search-${query.value}`,
  async () =>
    query.value ? (await getAllPlayers({ search: query.value, limit: SEARCH_LIMIT })).players : [],
  { server: false, default: () => [] },
);

const items = computed(() =>
  (results.value ?? [])
    .filter((candidate) => candidate.slug !== excludedSlug)
    .map((candidate) => toOption(candidate)),
);

function select(option: PlayerOption | undefined) {
  if (option) emit("select", option.value);
}
</script>

<template>
  <UFormField :label="label" class="w-full min-w-0">
    <UInputMenu
      v-model:search-term="searchTerm"
      :model-value="selected"
      :items="items"
      by="value"
      ignore-filter
      :loading="status === 'pending'"
      icon="i-fluent-search-24-regular"
      :placeholder="t('page.player.compare.searchPlaceholder')"
      class="w-full"
      @update:model-value="select"
    >
      <template #empty>
        {{ query ? t("components.input.noResult") : t("page.player.compare.searchHint") }}
      </template>
    </UInputMenu>
  </UFormField>
</template>
