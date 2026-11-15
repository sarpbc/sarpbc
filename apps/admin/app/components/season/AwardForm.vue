<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import { SEASON_AWARD_TYPES } from "@sarpbc/types";
import type { Player, SeasonAwardInput, SeasonAwardType } from "@sarpbc/types";
import {
  SEASON_AWARD_PRESENTER_MAX_LENGTH,
  SEASON_AWARD_REGION_MAX_LENGTH,
  SEASON_AWARD_SOURCE_URL_MAX_LENGTH,
} from "@sarpbc/utils";

defineProps<{ loading: boolean }>();

const emit = defineEmits<{ submit: [input: SeasonAwardInput] }>();

const { t } = useI18n();
const reportError = useReportError();

const awardType = ref<SeasonAwardType>("season_mvp");
const player = ref<Pick<Player, "id" | "name"> | null>(null);
const query = ref("");
const results = ref<Player[]>([]);
const searching = ref(false);
const region = ref("");
const presentedBy = ref("");
const sourceUrl = ref("");

const awardTypeOptions = SEASON_AWARD_TYPES.map((type) => ({
  label: t(`page.seasons.awards.types.${type}`),
  value: type,
}));

const showsRegion = computed(() => awardType.value !== "season_mvp");
const requiresRegion = computed(() => awardType.value === "regional_mvp");

const isValid = computed(
  () =>
    player.value !== null &&
    sourceUrl.value.trim().length > 0 &&
    (!requiresRegion.value || region.value.trim().length > 0),
);

const runSearch = async (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    results.value = [];

    return;
  }

  searching.value = true;

  try {
    results.value = await searchPlayers(trimmed);
  } catch (searchError) {
    results.value = [];
    reportError(searchError);
  } finally {
    searching.value = false;
  }
};

watchDebounced(query, runSearch, { debounce: SEARCH_DEBOUNCE_MS });

const pick = (candidate: Player) => {
  player.value = { id: candidate.id, name: candidate.name };
  query.value = "";
  results.value = [];
};

const reset = () => {
  player.value = null;
  region.value = "";
  presentedBy.value = "";
  sourceUrl.value = "";
};

const submit = () => {
  if (!isValid.value || !player.value) {
    return;
  }

  emit("submit", {
    awardType: awardType.value,
    playerId: player.value.id,
    presentedBy: presentedBy.value.trim() || null,
    region: showsRegion.value ? region.value.trim() || null : null,
    sourceUrl: sourceUrl.value.trim(),
  });
};

defineExpose({ reset });
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <div class="grid gap-4 sm:grid-cols-2">
      <SFormField :label="$t('page.seasons.awards.awardType')" required>
        <SSelect v-model="awardType" :items="awardTypeOptions" class="w-full" />
      </SFormField>
      <SFormField
        v-if="showsRegion"
        :label="$t('page.seasons.awards.region')"
        :hint="
          requiresRegion
            ? $t('page.seasons.awards.regionRequired')
            : $t('page.seasons.awards.regionOptional')
        "
        :required="requiresRegion"
      >
        <SInput
          v-model="region"
          :maxlength="SEASON_AWARD_REGION_MAX_LENGTH"
          autocomplete="off"
          class="w-full"
        />
      </SFormField>
    </div>

    <SFormField :label="$t('page.seasons.awards.player')" required>
      <div class="flex flex-col gap-2">
        <div v-if="player" class="flex flex-row items-center justify-between gap-2 text-sm">
          <span class="font-medium" translate="no">{{ player.name }}</span>
          <SButton
            type="button"
            variant="tertiary"
            size="sm"
            icon="i-fluent-dismiss-24-regular"
            :aria-label="$t('page.seasons.awards.clearPlayer', { name: player.name })"
            @click="player = null"
          />
        </div>
        <template v-else>
          <SInput
            v-model="query"
            :loading="searching"
            :placeholder="$t('page.seasons.awards.searchPlayer')"
            :aria-label="$t('page.seasons.awards.searchPlayer')"
            icon="i-fluent-search-24-regular"
            autocomplete="off"
            class="w-full"
          />
          <div
            v-if="query.trim() && !searching"
            class="max-h-56 overflow-y-auto overscroll-contain"
          >
            <ul v-if="results.length" class="flex flex-col gap-1">
              <li v-for="candidate in results" :key="candidate.id">
                <SButton
                  type="button"
                  variant="tertiary"
                  size="sm"
                  block
                  class="justify-start"
                  :label="candidate.name"
                  @click="pick(candidate)"
                />
              </li>
            </ul>
            <p v-else class="text-sm text-muted">{{ $t("page.seasons.awards.noPlayers") }}</p>
          </div>
        </template>
      </div>
    </SFormField>

    <SFormField
      :label="$t('page.seasons.awards.presentedBy')"
      :hint="$t('page.seasons.awards.presentedByHint')"
    >
      <SInput
        v-model="presentedBy"
        :maxlength="SEASON_AWARD_PRESENTER_MAX_LENGTH"
        autocomplete="off"
        class="w-full"
      />
    </SFormField>

    <SFormField
      :label="$t('page.seasons.awards.sourceUrl')"
      :hint="$t('page.seasons.awards.sourceUrlHint')"
      required
    >
      <SInput
        v-model="sourceUrl"
        type="url"
        :maxlength="SEASON_AWARD_SOURCE_URL_MAX_LENGTH"
        autocomplete="off"
        spellcheck="false"
        placeholder="https://"
        class="w-full"
      />
    </SFormField>

    <div>
      <SButton
        type="submit"
        :label="$t('page.seasons.awards.add')"
        :loading="loading"
        :disabled="!isValid"
      />
    </div>
  </form>
</template>
