<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import {
  ON_THIS_DAY_LINK_KINDS,
  type OnThisDayFact,
  type OnThisDayFactInput,
  type OnThisDayLinkKind,
} from "@sarpbc/types";
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

const props = defineProps<{
  fact?: OnThisDayFact;
  submitLabel: string;
  loading: boolean;
}>();

const emit = defineEmits<{ submit: [input: OnThisDayFactInput] }>();

const { t, locale } = useI18n();
const { sourceUrlError: checkSourceUrl } = useSourceUrl();
const reportError = useReportError();

function linkLabel(link: NonNullable<OnThisDayFact["link"]>): string {
  return link.kind === "tournament" ? tournamentStageLabel(link) : link.name;
}

const month = ref(props.fact?.month ?? 1);
const day = ref(props.fact?.day ?? 1);
const year = ref(props.fact?.year ? String(props.fact.year) : "");
const textEn = ref(props.fact?.textEn ?? "");
const textFr = ref(props.fact?.textFr ?? "");
const sourceUrl = ref(props.fact?.sourceUrl ?? "");
const linkKind = ref<OnThisDayLinkKind | typeof NO_LINK>(props.fact?.link?.kind ?? NO_LINK);

const linked = ref<Candidate | null>(
  props.fact?.link ? { id: props.fact.link.id, label: linkLabel(props.fact.link) } : null,
);

const matchStage = ref<Candidate | null>(null);
const query = ref("");
const results = ref<Candidate[]>([]);
const searching = ref(false);

const monthOptions = computed(() => {
  const format = new Intl.DateTimeFormat(locale.value, { month: "long", timeZone: "UTC" });

  return Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: format.format(new Date(Date.UTC(2024, index, 1))),
  }));
});

const dayOptions = computed(() =>
  Array.from({ length: 31 }, (_, index) => index + 1)
    .filter((value) => isMonthDay(month.value, value))
    .map((value) => ({ value, label: String(value) })),
);

const linkKindOptions = computed(() => [
  { value: NO_LINK, label: t("page.onThisDay.form.link.none") },
  ...ON_THIS_DAY_LINK_KINDS.map((kind) => ({
    value: kind,
    label: t(`page.onThisDay.form.link.kinds.${kind}`),
  })),
]);

watch(month, () => {
  if (!isMonthDay(month.value, day.value)) day.value = 1;
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

async function search(kind: OnThisDayLinkKind, value: string): Promise<Candidate[]> {
  switch (kind) {
    case "player":
      return (await searchPlayers(value)).map(({ id, name }) => ({ id, label: name }));
    case "team":
      return (await searchTeams(value)).map(({ id, name }) => ({ id, label: name }));
    case "tournament":
    case "match":
      return (await searchTournaments(value)).map((stage) => ({
        id: stage.id,
        label: tournamentStageLabel(stage),
      }));
    default: {
      const exhaustive: never = kind;

      return exhaustive;
    }
  }
}

async function runSearch(value: string) {
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
}

watchDebounced(query, runSearch, { debounce: SEARCH_DEBOUNCE_MS });

const stageMatches = ref<Candidate[]>([]);
const loadingMatches = ref(false);

async function pickStageForMatch(stage: Candidate) {
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
}

function pick(candidate: Candidate) {
  query.value = "";
  results.value = [];

  if (linkKind.value === "match") {
    void pickStageForMatch(candidate);

    return;
  }

  linked.value = candidate;
}

function clearLink() {
  linked.value = null;
  matchStage.value = null;
  stageMatches.value = [];
}

function submit() {
  if (!isValid.value) return;
  emit("submit", {
    month: month.value,
    day: day.value,
    year: parsedYear.value,
    textEn: textEn.value.trim(),
    textFr: textFr.value.trim(),
    link:
      linkKind.value !== NO_LINK && linked.value
        ? { kind: linkKind.value, id: linked.value.id }
        : null,
    sourceUrl: sourceUrl.value.trim() || null,
  });
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <div class="grid gap-4 sm:grid-cols-3">
      <UFormField :label="$t('page.onThisDay.form.month')" name="month" required>
        <USelect
          v-model="month"
          :items="monthOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('page.onThisDay.form.day')" name="day" required>
        <USelect
          v-model="day"
          :items="dayOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
      </UFormField>
      <UFormField
        :label="$t('page.onThisDay.form.year')"
        :hint="$t('page.onThisDay.form.yearHint')"
        :error="yearError"
        name="year"
      >
        <UInput v-model="year" inputmode="numeric" autocomplete="off" class="w-full" />
      </UFormField>
    </div>

    <UFormField
      :label="$t('page.onThisDay.form.textEn')"
      :hint="$t('page.onThisDay.form.textHint')"
      name="textEn"
      required
    >
      <UTextarea
        v-model="textEn"
        :maxlength="ON_THIS_DAY_TEXT_MAX_LENGTH"
        :rows="2"
        autoresize
        class="w-full"
      />
    </UFormField>
    <UFormField :label="$t('page.onThisDay.form.textFr')" name="textFr" required>
      <UTextarea
        v-model="textFr"
        :maxlength="ON_THIS_DAY_TEXT_MAX_LENGTH"
        :rows="2"
        autoresize
        lang="fr"
        class="w-full"
      />
    </UFormField>

    <UFormField
      :label="$t('page.onThisDay.form.link.label')"
      :hint="$t('page.onThisDay.form.link.hint')"
      name="linkKind"
    >
      <div class="flex flex-col gap-2">
        <USelect
          v-model="linkKind"
          :items="linkKindOptions"
          value-key="value"
          label-key="label"
          class="w-full"
        />
        <div v-if="linked" class="flex flex-row items-center justify-between gap-2 text-sm">
          <span class="font-medium" translate="no">{{ linked.label }}</span>
          <UButton
            type="button"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-fluent-dismiss-24-regular"
            :aria-label="$t('page.onThisDay.form.link.clear', { name: linked.label })"
            @click="clearLink"
          />
        </div>
        <template v-else-if="linkKind !== NO_LINK">
          <div v-if="matchStage" class="flex flex-col gap-2">
            <div class="flex flex-row items-center justify-between gap-2 text-sm">
              <span class="text-muted" translate="no">{{ matchStage.label }}</span>
              <UButton
                type="button"
                size="xs"
                color="neutral"
                variant="ghost"
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
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
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
            <UInput
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
                  <UButton
                    type="button"
                    color="neutral"
                    variant="ghost"
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
    </UFormField>

    <UFormField
      :label="$t('page.onThisDay.form.sourceUrl')"
      :hint="$t('page.onThisDay.form.sourceUrlHint')"
      :error="sourceError"
      name="sourceUrl"
    >
      <UInput
        v-model="sourceUrl"
        type="url"
        :maxlength="ON_THIS_DAY_SOURCE_URL_MAX_LENGTH"
        autocomplete="off"
        spellcheck="false"
        placeholder="https://"
        class="w-full"
      />
    </UFormField>

    <div>
      <UButton type="submit" :label="submitLabel" :loading="loading" :disabled="!isValid" />
    </div>
  </form>
</template>
