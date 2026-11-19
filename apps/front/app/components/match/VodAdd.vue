<script setup lang="ts">
import type { MatchVod } from "@sarpbc/types";
import { getApiErrorMessage, isIso6391Code, maxVodGame, parseMatchVodUrl } from "@sarpbc/utils";
import type { Match } from "~/types/matches";

const { match } = defineProps<{ match: Match }>();

const emit = defineEmits<{
  saved: [vods: MatchVod[]];
}>();

const { t, locale } = useI18n();
const toast = useToast();

const staffMode = useStaffMode();

const canManage = computed(() => staffMode.can("tournaments.manage"));

const open = ref(false);
const saving = ref(false);
const game = ref(1);
const url = ref("");
const language = ref("");

const gameOptions = computed(() =>
  Array.from({ length: maxVodGame(match.numberOfGames) }, (_, index) => ({
    label: t("page.match.detail.vods.game", { number: index + 1 }),
    value: index + 1,
  })),
);

const parsedUrl = computed(() => parseMatchVodUrl(url.value));
const languageCode = computed(() => language.value.trim().toLowerCase());
const languageValid = computed(() => isIso6391Code(languageCode.value));

const urlError = computed(() => {
  if (!url.value.trim() || parsedUrl.value.ok) {
    return;
  }

  return t(`page.match.detail.vodAdd.errors.${parsedUrl.value.error}`);
});

const languageError = computed(() =>
  languageValid.value ? undefined : t("page.match.detail.vodAdd.errors.invalid-language"),
);

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  const lastGame = Math.max(0, ...(match.vods ?? []).map((vod) => vod.game));
  game.value = Math.min(lastGame + 1, maxVodGame(match.numberOfGames));
  url.value = "";
  language.value = locale.value.slice(0, 2);
});

const submit = async () => {
  if (!parsedUrl.value.ok || !languageValid.value || saving.value) {
    return;
  }

  saving.value = true;

  try {
    // WARNING: the API replaces the whole list, so start from the latest one to keep another staff member's VODs.
    const { match: latest } = await getMatchById(match.id);

    const vods = await setMatchVods(match.id, [
      ...(latest.vods ?? []).map((vod) => ({
        game: vod.game,
        language: vod.language,
        url: vod.url,
      })),
      { game: game.value, language: languageCode.value, url: parsedUrl.value.url },
    ]);

    emit("saved", vods);
    toast.add({ color: "success", title: t("page.match.detail.vodAdd.saved") });
    open.value = false;
  } catch (error) {
    toast.add({
      color: "danger",
      description: getApiErrorMessage(error) ?? undefined,
      title: t("page.match.detail.vodAdd.saveError"),
    });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <SPopover v-if="canManage" v-model:open="open">
    <SButton
      icon="i-fluent-more-horizontal-24-regular"
      variant="tertiary"
      size="sm"
      class="-my-1"
      :aria-label="t('page.match.detail.vodAdd.title')"
    />

    <template #content>
      <form class="flex w-72 flex-col gap-3 p-3" @submit.prevent="submit">
        <p class="text-sm font-medium text-highlighted">
          {{ t("page.match.detail.vodAdd.title") }}
        </p>
        <SFormField :label="t('page.match.detail.vodAdd.game')">
          <SSelect v-model="game" :items="gameOptions" class="w-full" />
        </SFormField>
        <SFormField :label="t('page.match.detail.vodAdd.url')" :error="urlError">
          <SInput
            v-model="url"
            type="url"
            inputmode="url"
            required
            class="w-full"
            :placeholder="t('page.match.detail.vodAdd.urlPlaceholder')"
          />
        </SFormField>
        <SFormField :label="t('page.match.detail.vodAdd.language')" :error="languageError">
          <SInput
            v-model="language"
            maxlength="2"
            autocomplete="off"
            spellcheck="false"
            class="w-full"
          />
        </SFormField>
        <SButton
          type="submit"
          block
          :label="t('page.match.detail.vodAdd.submit')"
          :loading="saving"
          :disabled="!parsedUrl.ok || !languageValid"
        />
      </form>
    </template>
  </SPopover>
</template>
