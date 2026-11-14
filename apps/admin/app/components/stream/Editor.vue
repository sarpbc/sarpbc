<script lang="ts" setup>
import type { StreamKind, StreamPlatform, StreamsResponse } from "@sarpbc/types";
import { STREAM_KINDS } from "@sarpbc/types";
import {
  isIso6391Code,
  LANGUAGE_CODE_LENGTH,
  MAX_STREAMS,
  parseStreamUrl,
  STREAM_CHANNEL_MAX_LENGTH,
} from "@sarpbc/utils";

interface StreamRow {
  key: number;
  url: string;
  channel: string;
  language: string;
  kind: StreamKind;
}

interface FieldFeedback {
  help?: string;
  error?: string;
}

const { path, title } = defineProps<{
  path: string;
  title: string;
}>();

const open = defineModel<boolean>("open", { default: false });

const { t, locale } = useI18n();
const toast = useToast();
const reportError = useReportError();

const rows = ref<StreamRow[]>([]);
const inheritedCount = ref(0);
const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);
let nextKey = 0;

const languageNames = computed(
  () => new Intl.DisplayNames([locale.value], { type: "language", fallback: "none" }),
);

const kindOptions = computed(() =>
  STREAM_KINDS.map((kind) => ({ value: kind, label: t(`page.tournaments.streams.kinds.${kind}`) })),
);

function normalizeLanguage(language: string): string {
  return language.trim().toLowerCase();
}

function languageFeedback(language: string): FieldFeedback {
  const code = normalizeLanguage(language);

  return isIso6391Code(code)
    ? { help: languageNames.value.of(code) }
    : { error: t("page.tournaments.streams.errors.invalid-language") };
}

function platformLabel(platform: StreamPlatform): string {
  switch (platform) {
    case "twitch":
      return t("page.tournaments.streams.platforms.twitch");
    case "youtube":
      return t("page.tournaments.streams.platforms.youtube");
    case "kick":
      return t("page.tournaments.streams.platforms.kick");
    case "other":
      return t("page.tournaments.streams.platforms.other");
    default: {
      const exhaustive: never = platform;

      return exhaustive;
    }
  }
}

function urlFeedback(url: string): FieldFeedback {
  if (!url.trim()) return {};
  const parsed = parseStreamUrl(url);

  return parsed.ok
    ? {
        help: t("page.tournaments.streams.detectedPlatform", {
          platform: platformLabel(parsed.platform),
        }),
      }
    : { error: t(`page.tournaments.streams.errors.${parsed.error}`) };
}

function derivedChannel(url: string): string | null {
  const parsed = parseStreamUrl(url);

  return parsed.ok ? parsed.channel : null;
}

function channelFeedback(row: StreamRow): FieldFeedback {
  if (row.channel.trim() || derivedChannel(row.url) || !row.url.trim()) return {};

  return { error: t("page.tournaments.streams.errors.channel-required") };
}

function isRowValid(row: StreamRow): boolean {
  return (
    parseStreamUrl(row.url).ok &&
    isIso6391Code(normalizeLanguage(row.language)) &&
    Boolean(row.channel.trim() || derivedChannel(row.url))
  );
}

const canSave = computed(() => rows.value.every(isRowValid));

function apply(response: StreamsResponse) {
  rows.value = response.streams.map(({ url, channel, language, kind }) => ({
    key: nextKey++,
    url,
    channel,
    language,
    kind,
  }));
  inheritedCount.value = response.inherited.length;
}

async function load() {
  loading.value = true;
  loadFailed.value = false;

  try {
    apply(await getStreams(path));
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
    url: "",
    channel: "",
    language: last?.language ?? "en",
    kind: last?.kind ?? "official",
  });
}

function removeRow(key: number) {
  rows.value = rows.value.filter((row) => row.key !== key);
}

async function save() {
  saving.value = true;

  try {
    apply(
      await setStreams(
        path,
        rows.value.map(({ url, channel, language, kind }) => ({
          url,
          language: normalizeLanguage(language),
          kind,
          channel: channel.trim() || undefined,
        })),
      ),
    );
    toast.add({ title: t("page.tournaments.streams.saved"), color: "success" });
    open.value = false;
  } catch (error) {
    reportError(error, t("page.tournaments.streams.saveError"));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="t('page.tournaments.streams.description')"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <p v-if="loading" class="text-sm text-muted" aria-live="polite">
        {{ t("page.tournaments.streams.loading") }}
      </p>

      <div v-else-if="loadFailed" class="flex flex-col items-start gap-2">
        <p class="text-sm text-error">{{ t("page.tournaments.streams.loadError") }}</p>
        <UButton
          size="sm"
          variant="soft"
          :label="t('page.tournaments.streams.retry')"
          @click="load"
        />
      </div>

      <div v-else class="flex flex-col gap-3">
        <p v-if="rows.length === 0" class="text-sm text-muted">
          {{ t("page.tournaments.streams.empty", { count: inheritedCount }, inheritedCount) }}
        </p>

        <div
          v-for="row in rows"
          :key="row.key"
          class="grid grid-cols-1 gap-2 border border-default p-3 sm:grid-cols-[minmax(0,1fr)_7rem_10rem_auto] sm:items-start"
        >
          <UFormField
            class="sm:col-span-3"
            :label="t('page.tournaments.streams.url')"
            v-bind="urlFeedback(row.url)"
          >
            <UInput
              v-model="row.url"
              type="url"
              inputmode="url"
              class="w-full"
              :placeholder="t('page.tournaments.streams.urlPlaceholder')"
            />
          </UFormField>

          <UButton
            class="sm:mt-6"
            color="error"
            variant="ghost"
            icon="i-fluent-delete-24-regular"
            :aria-label="t('page.tournaments.streams.remove')"
            @click="removeRow(row.key)"
          />

          <UFormField :label="t('page.tournaments.streams.channel')" v-bind="channelFeedback(row)">
            <UInput
              v-model="row.channel"
              :maxlength="STREAM_CHANNEL_MAX_LENGTH"
              autocomplete="off"
              spellcheck="false"
              class="w-full"
              :placeholder="
                derivedChannel(row.url) ?? t('page.tournaments.streams.channelPlaceholder')
              "
            />
          </UFormField>

          <UFormField
            :label="t('page.tournaments.streams.language')"
            v-bind="languageFeedback(row.language)"
          >
            <UInput
              v-model="row.language"
              :maxlength="LANGUAGE_CODE_LENGTH"
              autocomplete="off"
              spellcheck="false"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('page.tournaments.streams.kind')">
            <USelect
              v-model="row.kind"
              :items="kindOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-row flex-wrap justify-between gap-2">
        <UButton
          variant="soft"
          icon="i-fluent-add-24-regular"
          :label="t('page.tournaments.streams.add')"
          :disabled="loading || loadFailed || rows.length >= MAX_STREAMS"
          @click="addRow"
        />
        <div class="flex flex-row gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('page.tournaments.streams.cancel')"
            @click="open = false"
          />
          <UButton
            :label="t('page.tournaments.streams.save')"
            :loading="saving"
            :disabled="loading || loadFailed || !canSave"
            @click="save"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
