<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import { ON_THIS_DAY_LINK_KINDS } from "@sarpbc/types";
import type { OnThisDayFact, OnThisDayFactInput, OnThisDayLinkKind } from "@sarpbc/types";
import {
  ON_THIS_DAY_MIN_YEAR,
  ON_THIS_DAY_SOURCE_URL_MAX_LENGTH,
  ON_THIS_DAY_TEXT_MAX_LENGTH,
  isMonthDay,
  participantName,
  tournamentStageLabel,
} from "@sarpbc/utils";

const NO_LINK = "none";

interface Candidate {
  id: string;
  label: string;
}

const { fact = null } = defineProps<{
  fact?: OnThisDayFact | null;
  submitLabel: string;
  loading: boolean;
}>();

const emit = defineEmits<{ submit: [input: OnThisDayFactInput] }>();

const { t, locale } = useI18n();
const { sourceUrlError: checkSourceUrl } = useSourceUrl();
const reportError = useReportError();

const linkLabel = (link: NonNullable<OnThisDayFact["link"]>): string =>
  link.kind === "tournament" ? tournamentStageLabel(link) : link.name;

const month = ref(fact?.month ?? 1);
const day = ref(fact?.day ?? 1);
const year = ref(fact?.year ? String(fact.year) : "");
const textEn = ref(fact?.textEn ?? "");
const textFr = ref(fact?.textFr ?? "");
const sourceUrl = ref(fact?.sourceUrl ?? "");
const linkKind = ref<OnThisDayLinkKind | typeof NO_LINK>(fact?.link?.kind ?? NO_LINK);

const linked = ref<Candidate | null>(
  fact?.link ? { id: fact.link.id, label: linkLabel(fact.link) } : null,
);

const matchStage = ref<Candidate | null>(null);
const query = ref("");
const results = ref<Candidate[]>([]);
const searching = ref(false);

const monthOptions = computed(() => {
  const format = new Intl.DateTimeFormat(locale.value, { month: "long", timeZone: "UTC" });

  return Array.from({ length: 12 }, (_, index) => ({
    label: format.format(new Date(Date.UTC(2024, index, 1))),
    value: index + 1,
  }));
});

const dayOptions = computed(() =>
  Array.from({ length: 31 }, (_, index) => index + 1)
    .filter((value) => isMonthDay(month.value, value))
    .map((value) => ({ label: String(value), value })),
);

const linkKindOptions = computed(() => [
  { label: t("page.onThisDay.form.link.none"), value: NO_LINK },
  ...ON_THIS_DAY_LINK_KINDS.map((kind) => ({
    label: t(`page.onThisDay.form.link.kinds.${kind}`),
    value: kind,
  })),
]);

watch(month, () => {
  if (!isMonthDay(month.value, day.value)) {
    day.value = 1;
  }
});

watch(linkKind, () => {
  linked.value = null;
  matchStage.value = null;
  query.value = "";
  results.value = [];
});

const parsedYear = computed(() => (year.value.trim() ? Number(year.value.trim()) : null));

const yearError = computed(() =>
  parsedYear.value !== null &&
  (!Number.isInteger(parsedYear.value) || parsedYear.value < ON_THIS_DAY_MIN_YEAR)
    ? t("page.onThisDay.form.yearInvalid", { min: ON_THIS_DAY_MIN_YEAR })
    : undefined,
);

const sourceError = computed(() => checkSourceUrl(sourceUrl.value));

const isValid = computed(
  () =>
    textEn.value.trim().length > 0 &&
    textFr.value.trim().length > 0 &&
    !yearError.value &&
    !sourceError.value &&
    (linkKind.value === NO_LINK || linked.value !== null),
);

const search = async (kind: OnThisDayLinkKind, value: string): Promise<Candidate[]> => {
  switch (kind) {
    case "player": {
      const players = await searchPlayers(value);

      return players.map(({ id, name }) => ({ id, label: name }));
    }

    case "team": {
      const teams = await searchTeams(value);

      return teams.map(({ id, name }) => ({ id, label: name }));
    }

    case "tournament":
    case "match": {
      const stages = await searchTournaments(value);

      return stages.map((stage) => ({ id: stage.id, label: tournamentStageLabel(stage) }));
    }

    default: {
      const exhaustive: never = kind;

      return exhaustive;
    }
  }
};

const runSearch = async (value: string) => {
  const trimmed = value.trim();
  const kind = linkKind.value;

  if (!trimmed || kind === NO_LINK) {
    results.value = [];

    return;
  }

  searching.value = true;

  try {
    results.value = await search(kind, trimmed);
  } catch (searchError) {
    results.value = [];
    reportError(searchError);
  } finally {
    searching.value = false;
  }
};

watchDebounced(query, runSearch, { debounce: SEARCH_DEBOUNCE_MS });

const stageMatches = ref<Candidate[]>([]);
const loadingMatches = ref(false);

const pickStageForMatch = async (stage: Candidate) => {
  matchStage.value = stage;
  loadingMatches.value = true;

  try {
    const matches = await getTournamentMatches(stage.id);
    stageMatches.value = matches.map((match) => ({
      id: match.id,
      label: match.participants.map((participant) => participantName(participant)).join(" vs "),
    }));
  } catch (loadError) {
    stageMatches.value = [];
    reportError(loadError);
  } finally {
    loadingMatches.value = false;
  }
};

const pick = (candidate: Candidate) => {
  query.value = "";
  results.value = [];

  if (linkKind.value === "match") {
    void pickStageForMatch(candidate);

    return;
  }

  linked.value = candidate;
};

const clearLink = () => {
  linked.value = null;
  matchStage.value = null;
  stageMatches.value = [];
};

const submit = () => {
  if (!isValid.value) {
    return;
  }

  emit("submit", {
    day: day.value,
    link:
      linkKind.value !== NO_LINK && linked.value
        ? { id: linked.value.id, kind: linkKind.value }
        : null,
    month: month.value,
    sourceUrl: sourceUrl.value.trim() || null,
    textEn: textEn.value.trim(),
    textFr: textFr.value.trim(),
    year: parsedYear.value,
  });
};
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <div class="grid gap-4 sm:grid-cols-3">
      <SbFormField :label="$t('page.onThisDay.form.month')" required>
        <SbSelect v-model="month" :items="monthOptions" class="w-full" />
      </SbFormField>
      <SbFormField :label="$t('page.onThisDay.form.day')" required>
        <SbSelect v-model="day" :items="dayOptions" class="w-full" />
      </SbFormField>
      <SbFormField
        :label="$t('page.onThisDay.form.year')"
        :hint="$t('page.onThisDay.form.yearHint')"
        :error="yearError"
      >
        <SbInput v-model="year" inputmode="numeric" autocomplete="off" class="w-full" />
      </SbFormField>
    </div>

    <SbFormField
      :label="$t('page.onThisDay.form.textEn')"
      :hint="$t('page.onThisDay.form.textHint')"
      required
    >
      <SbTextarea
        v-model="textEn"
        :maxlength="ON_THIS_DAY_TEXT_MAX_LENGTH"
        :rows="2"
        autoresize
        class="w-full"
      />
    </SbFormField>
    <SbFormField :label="$t('page.onThisDay.form.textFr')" required>
      <SbTextarea
        v-model="textFr"
        :maxlength="ON_THIS_DAY_TEXT_MAX_LENGTH"
        :rows="2"
        autoresize
        lang="fr"
        class="w-full"
      />
    </SbFormField>

    <SbFormField
      :label="$t('page.onThisDay.form.link.label')"
      :hint="$t('page.onThisDay.form.link.hint')"
    >
      <div class="flex flex-col gap-2">
        <SbSelect v-model="linkKind" :items="linkKindOptions" class="w-full" />
        <div v-if="linked" class="flex flex-row items-center justify-between gap-2 text-sm">
          <span class="font-medium" translate="no">{{ linked.label }}</span>
          <SbButton
            type="button"
            variant="tertiary"
            size="sm"
            icon="i-fluent-dismiss-24-regular"
            :aria-label="$t('page.onThisDay.form.link.clear', { name: linked.label })"
            @click="clearLink"
          />
        </div>
        <template v-else-if="linkKind !== NO_LINK">
          <div v-if="matchStage" class="flex flex-col gap-2">
            <div class="flex flex-row items-center justify-between gap-2 text-sm">
              <span class="text-muted" translate="no">{{ matchStage.label }}</span>
              <SbButton
                type="button"
                variant="tertiary"
                size="sm"
                icon="i-fluent-dismiss-24-regular"
                :aria-label="$t('page.onThisDay.form.link.clear', { name: matchStage.label })"
                @click="clearLink"
              />
            </div>
            <p v-if="loadingMatches" class="text-sm text-muted">
              {{ $t("page.onThisDay.form.link.loadingMatches") }}
            </p>
            <ul
              v-else-if="stageMatches.length"
              class="flex max-h-56 flex-col gap-1 overflow-y-auto"
            >
              <li v-for="match in stageMatches" :key="match.id">
                <SbButton
                  type="button"
                  variant="tertiary"
                  size="sm"
                  block
                  class="justify-start"
                  :label="match.label"
                  @click="linked = match"
                />
              </li>
            </ul>
            <p v-else class="text-sm text-muted">{{ $t("page.onThisDay.form.link.noMatches") }}</p>
          </div>
          <template v-else>
            <SbInput
              v-model="query"
              :loading="searching"
              :placeholder="
                $t(
                  `page.onThisDay.form.link.search.${linkKind === 'match' ? 'tournament' : linkKind}`,
                )
              "
              :aria-label="
                $t(
                  `page.onThisDay.form.link.search.${linkKind === 'match' ? 'tournament' : linkKind}`,
                )
              "
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
                  <SbButton
                    type="button"
                    variant="tertiary"
                    size="sm"
                    block
                    class="justify-start"
                    :label="candidate.label"
                    @click="pick(candidate)"
                  />
                </li>
              </ul>
              <p v-else class="text-sm text-muted">
                {{ $t("page.onThisDay.form.link.noResults") }}
              </p>
            </div>
          </template>
        </template>
      </div>
    </SbFormField>

    <SbFormField
      :label="$t('page.onThisDay.form.sourceUrl')"
      :hint="$t('page.onThisDay.form.sourceUrlHint')"
      :error="sourceError"
    >
      <SbInput
        v-model="sourceUrl"
        type="url"
        :maxlength="ON_THIS_DAY_SOURCE_URL_MAX_LENGTH"
        autocomplete="off"
        spellcheck="false"
        placeholder="https://"
        class="w-full"
      />
    </SbFormField>

    <div>
      <SbButton type="submit" :label="submitLabel" :loading="loading" :disabled="!isValid" />
    </div>
  </form>
</template>
