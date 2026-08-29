<script setup lang="ts">
import type { Player, Team } from "@sarpbc/types";
import { resolveThemedLogoUrl, type NewsEntityTagKind } from "@sarpbc/utils";

const props = defineProps<{
  kind: NewsEntityTagKind;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  select: [payload: { slug: string; label: string }];
}>();

const { t } = useI18n();
const colorMode = useColorMode();

const query = ref("");
const pending = ref(false);
const results = ref<Array<Player | Team>>([]);

const title = computed(() =>
  props.kind === "player"
    ? t("page.news.editor.picker.titlePlayer")
    : t("page.news.editor.picker.titleTeam"),
);

const placeholder = computed(() =>
  props.kind === "player"
    ? t("page.news.editor.picker.placeholderPlayer")
    : t("page.news.editor.picker.placeholderTeam"),
);

let searchTimer: ReturnType<typeof setTimeout> | undefined;

async function runSearch(searchQuery: string) {
  const trimmed = searchQuery.trim();
  if (!trimmed) {
    results.value = [];
    return;
  }

  pending.value = true;
  try {
    const path =
      props.kind === "player"
        ? `/search/players?q=${encodeURIComponent(trimmed)}&limit=10`
        : `/search/teams?q=${encodeURIComponent(trimmed)}&limit=10`;
    results.value = await apiFetch<Player[] | Team[]>(path);
  } catch {
    results.value = [];
  } finally {
    pending.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      query.value = "";
      results.value = [];
      void runSearch("");
    }
  },
);

watch(query, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void runSearch(value);
  }, 250);
});

function onSelect(item: Player | Team) {
  emit("update:open", false);
  emit("select", { slug: item.slug, label: item.name });
}

function close() {
  emit("update:open", false);
}

function itemLogoSrc(item: Player | Team) {
  if (props.kind === "team") {
    return resolveThemedLogoUrl(item.imageUrl, (item as Team).darkModeImageUrl, colorMode.value);
  }
  return item.imageUrl ?? undefined;
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :dismissible="!pending"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UInput
          v-model="query"
          :placeholder="placeholder"
          autofocus
          icon="i-lucide-search"
          :loading="pending"
        />

        <ul v-if="results.length > 0" class="flex max-h-72 flex-col gap-1 overflow-y-auto">
          <li v-for="item in results" :key="item.id">
            <UButton
              color="neutral"
              variant="ghost"
              class="w-full justify-start gap-3"
              @click="onSelect(item)"
            >
              <UAvatar
                :src="itemLogoSrc(item)"
                :alt="item.name"
                size="sm"
                :icon="
                  kind === 'team' ? 'i-fluent-people-team-24-regular' : 'i-fluent-person-24-regular'
                "
              />
              <span class="truncate" translate="no">{{ item.name }}</span>
            </UButton>
          </li>
        </ul>

        <p v-else-if="query.trim() && !pending" class="text-sm text-muted">
          {{ t("page.news.editor.picker.empty") }}
        </p>
      </div>
    </template>

    <template #footer>
      <UButton color="neutral" variant="subtle" :label="t('common.cancel')" @click="close" />
    </template>
  </UModal>
</template>
