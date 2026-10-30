<script lang="ts" setup>
import type { MatchVod, MatchVodSource, TournamentMatchListItem } from "@sarpbc/types";
import { ISO_639_1_CODES, maxVodGame, parseMatchVodUrl } from "@sarpbc/utils";
import { getApiErrorMessage } from "~/utils/apiError";

interface VodRow {
  key: number;
  game: number;
  url: string;
  language: string;
}

interface UrlFeedback {
  help?: string;
  error?: string;
}

const { match, label } = defineProps<{
  match: TournamentMatchListItem;
  label: string;
}>();
const open = defineModel<boolean>("open", { default: false });

const { t, locale } = useI18n();
const toast = useToast();

const rows = ref<VodRow[]>([]);
const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);
let nextKey = 0;

const gameOptions = computed(() =>
  Array.from({ length: maxVodGame(match.numberOfGames) }, (_, index) => ({
    value: index + 1,
    label: t("page.tournaments.vods.game", { number: index + 1 }),
  })),
);

const languageOptions = computed(() => {
  const names = new Intl.DisplayNames([locale.value], { type: "language" });
  return ISO_639_1_CODES.map<{ value: string; label: string }>((code) => ({
    value: code,
    label: `${code.toUpperCase()} · ${names.of(code) ?? code}`,
  }));
});

function sourceLabel(source: MatchVodSource): string {
  switch (source) {
    case "twitch":
      return t("page.tournaments.vods.sources.twitch");
    case "youtube":
      return t("page.tournaments.vods.sources.youtube");
    default: {
      const exhaustive: never = source;
      return exhaustive;
    }
  }
}

function urlFeedback(url: string): UrlFeedback {
  if (!url.trim()) return {};
  const parsed = parseMatchVodUrl(url);
  return parsed.ok
    ? { help: t("page.tournaments.vods.detectedSource", { source: sourceLabel(parsed.source) }) }
    : { error: t(`page.tournaments.vods.errors.${parsed.error}`) };
}

const canSave = computed(() => rows.value.every((row) => parseMatchVodUrl(row.url).ok));

function toRows(vods: MatchVod[]): VodRow[] {
  return vods.map(({ game, url, language }) => ({ key: nextKey++, game, url, language }));
}

async function load() {
  loading.value = true;
  loadFailed.value = false;
  try {
    rows.value = toRows(await getMatchVods(match.id));
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) void load();
  },
  { immediate: true },
);

function addRow() {
  const last = rows.value.at(-1);
  rows.value.push({
    key: nextKey++,
    game: last ? Math.min(last.game + 1, maxVodGame(match.numberOfGames)) : 1,
    url: "",
    language: last?.language ?? "en",
  });
}

function removeRow(key: number) {
  rows.value = rows.value.filter((row) => row.key !== key);
}

async function save() {
  saving.value = true;
  try {
    const vods = await setMatchVods(
      match.id,
      rows.value.map(({ game, url, language }) => ({ game, url, language })),
    );
    rows.value = toRows(vods);
    toast.add({ title: t("page.tournaments.vods.saved"), color: "success" });
    open.value = false;
  } catch (error) {
    toast.add({
      title: t("page.tournaments.vods.saveError"),
      description: getApiErrorMessage(error) ?? undefined,
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('page.tournaments.vods.title', { match: label })"
    :description="t('page.tournaments.vods.description')"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <p v-if="loading" class="text-sm text-muted" aria-live="polite">
        {{ t("page.tournaments.vods.loading") }}
      </p>

      <div v-else-if="loadFailed" class="flex flex-col items-start gap-2">
        <p class="text-sm text-error">{{ t("page.tournaments.vods.loadError") }}</p>
        <UButton size="sm" variant="soft" :label="t('page.tournaments.vods.retry')" @click="load" />
      </div>

      <div v-else class="flex flex-col gap-3">
        <p v-if="rows.length === 0" class="text-sm text-muted">
          {{ t("page.tournaments.vods.empty") }}
        </p>

        <div
          v-for="row in rows"
          :key="row.key"
          class="grid grid-cols-1 gap-2 border border-default p-3 sm:grid-cols-[8rem_minmax(0,1fr)_12rem_auto] sm:items-start"
        >
          <UFormField :label="t('page.tournaments.vods.gameLabel')">
            <USelect
              v-model="row.game"
              :items="gameOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('page.tournaments.vods.url')" v-bind="urlFeedback(row.url)">
            <UInput
              v-model="row.url"
              type="url"
              inputmode="url"
              class="w-full"
              :placeholder="t('page.tournaments.vods.urlPlaceholder')"
            />
          </UFormField>

          <UFormField :label="t('page.tournaments.vods.language')">
            <USelectMenu
              v-model="row.language"
              :items="languageOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <UButton
            class="sm:mt-6"
            color="error"
            variant="ghost"
            icon="i-fluent-delete-24-regular"
            :aria-label="t('page.tournaments.vods.remove')"
            @click="removeRow(row.key)"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-row flex-wrap justify-between gap-2">
        <UButton
          variant="soft"
          icon="i-fluent-add-24-regular"
          :label="t('page.tournaments.vods.add')"
          :disabled="loading || loadFailed"
          @click="addRow"
        />
        <div class="flex flex-row gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('page.tournaments.vods.cancel')"
            @click="open = false"
          />
          <UButton
            :label="t('page.tournaments.vods.save')"
            :loading="saving"
            :disabled="loading || loadFailed || !canSave"
            @click="save"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
