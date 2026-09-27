<script setup lang="ts">
import type { TabsItem } from "@nuxt/ui";

interface Props {
  tournamentId: string;
  activeTab: "overview" | "matches";
}

const { tournamentId, activeTab } = defineProps<Props>();

const { t } = useI18n();
const localePath = useLocalePath();

const tabItems = computed<TabsItem[]>(() => [
  { value: "overview", label: t("common.overview") },
  { value: "matches", label: t("general.matches") },
]);

function onTabChange(value: string | number) {
  const path =
    value === "matches" ? `/tournaments/${tournamentId}/matches` : `/tournaments/${tournamentId}`;
  navigateTo(localePath(path));
}
</script>

<template>
  <UTabs
    :model-value="activeTab"
    :items="tabItems"
    :content="false"
    color="neutral"
    variant="link"
    class="w-full"
    :ui="{ list: 'h-row items-center border-t border-b-0 py-0 mb-0' }"
    @update:model-value="onTabChange"
  />
</template>
