<script setup lang="ts">
import type { MatchVod } from "@sarpbc/types";
import {
  getApiErrorMessage,
  hasPermission,
  isIso6391Code,
  maxVodGame,
  parseMatchVodUrl,
} from "@sarpbc/utils";
import type { Match } from "~/types/matches";

const { match } = defineProps<{ match: Match }>();

const emit = defineEmits<{
  saved: [vods: MatchVod[]];
}>();

const { t, locale } = useI18n();
const user = useUser();
const toast = useToast();

const canManage = computed(() => hasPermission(user.value, "tournaments.manage"));

const open = ref(false);
const saving = ref(false);
const game = ref(1);
const url = ref("");
const language = ref("");

const gameOptions = computed(() =>
  Array.from({ length: maxVodGame(match.numberOfGames) }, (_, index) => ({
    value: index + 1,
    label: t("page.match.detail.vods.game", { number: index + 1 }),
  })),
);

const parsedUrl = computed(() => parseMatchVodUrl(url.value));
const languageCode = computed(() => language.value.trim().toLowerCase());
const languageValid = computed(() => isIso6391Code(languageCode.value));

const urlError = computed(() => {
  if (!url.value.trim() || parsedUrl.value.ok) return;

  return t(`page.match.detail.vodAdd.errors.${parsedUrl.value.error}`);
});

const languageError = computed(() =>
  languageValid.value ? undefined : t("page.match.detail.vodAdd.errors.invalid-language"),
);

watch(open, (isOpen) => {
  if (!isOpen) return;
  const lastGame = Math.max(0, ...(match.vods ?? []).map((vod) => vod.game));
  game.value = Math.min(lastGame + 1, maxVodGame(match.numberOfGames));
  url.value = "";
  language.value = locale.value.slice(0, 2);
});

async function submit() {
  if (!parsedUrl.value.ok || !languageValid.value || saving.value) return;

  saving.value = true;

  try {
    // The API replaces the whole list: start from the latest one so another staff member's VODs survive.
    const { match: latest } = await getMatchById(match.id);

    const vods = await setMatchVods(match.id, [
      ...(latest.vods ?? []).map((vod) => ({
        game: vod.game,
        url: vod.url,
        language: vod.language,
      })),
      { game: game.value, url: parsedUrl.value.url, language: languageCode.value },
    ]);

    emit("saved", vods);
    toast.add({ title: t("page.match.detail.vodAdd.saved"), color: "success" });
    open.value = false;
  } catch (error) {
    toast.add({
      title: t("page.match.detail.vodAdd.saveError"),
      description: getApiErrorMessage(error) ?? undefined,
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UPopover v-if="canManage" v-model:open="open">
    <UButton
      icon="i-fluent-more-horizontal-24-regular"
      color="neutral"
      variant="ghost"
      size="xs"
      class="-my-1"
      :aria-label="t('page.match.detail.vodAdd.title')"
    />

    <template #content>
      <form class="flex w-72 flex-col gap-3 p-3" @submit.prevent="submit">
        <p class="text-sm font-medium text-highlighted">
          {{ t("page.match.detail.vodAdd.title") }}
        </p>
        <UFormField :label="t('page.match.detail.vodAdd.game')">
          <USelect
            v-model="game"
            :items="gameOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('page.match.detail.vodAdd.url')" :error="urlError">
          <UInput
            v-model="url"
            type="url"
            inputmode="url"
            required
            class="w-full"
            :placeholder="t('page.match.detail.vodAdd.urlPlaceholder')"
          />
        </UFormField>
        <UFormField :label="t('page.match.detail.vodAdd.language')" :error="languageError">
          <UInput
            v-model="language"
            maxlength="2"
            autocomplete="off"
            spellcheck="false"
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          block
          :label="t('page.match.detail.vodAdd.submit')"
          :loading="saving"
          :disabled="!parsedUrl.ok || !languageValid"
        />
      </form>
    </template>
  </UPopover>
</template>
