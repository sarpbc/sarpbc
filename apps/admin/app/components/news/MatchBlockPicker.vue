<script setup lang="ts">
import type {
  MatchBlocksResponse,
  Team,
  TournamentEventRef,
  TournamentMatchListItem,
} from "@sarpbc/types";
import {
  NEWS_MATCH_BLOCK_DEFAULT_LIMIT,
  NEWS_MATCH_BLOCK_MAX_MATCHES,
  newsMatchBlockKey,
  type NewsMatchBlock,
  type NewsMatchBlockKind,
} from "@sarpbc/utils";

type Selection = { id: string; label: string };
type TournamentResult = { id: string; name: string; event: TournamentEventRef };

const props = defineProps<{
  open: boolean;
  block: NewsMatchBlock | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  select: [block: NewsMatchBlock];
}>();

const { t, locale } = useI18n();

const kind = ref<NewsMatchBlockKind>("match");
const source = ref<Selection | null>(null);
const matchIds = ref<string[]>([]);
const limit = ref(NEWS_MATCH_BLOCK_DEFAULT_LIMIT);
const query = ref("");
const results = ref<Selection[]>([]);
const searching = ref(false);
const matches = ref<TournamentMatchListItem[]>([]);
const loadingMatches = ref(false);

const kindItems = computed(() => [
  { value: "match", label: t("page.news.editor.matches.kind.match") },
  { value: "matches", label: t("page.news.editor.matches.kind.matches") },
  { value: "tournament", label: t("page.news.editor.matches.kind.tournament") },
  { value: "team", label: t("page.news.editor.matches.kind.team") },
]);

const searchesTeams = computed(() => kind.value === "team");
const picksMatches = computed(() => kind.value === "match" || kind.value === "matches");

const dateFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }),
);

const block = computed((): NewsMatchBlock | null => {
  if (!source.value) {
    return null;
  }
  switch (kind.value) {
    case "match":
      return matchIds.value[0] ? { kind: "match", id: matchIds.value[0] } : null;
    case "matches":
      return matchIds.value.length > 0 ? { kind: "matches", ids: matchIds.value } : null;
    case "tournament":
      return { kind: "tournament", id: source.value.id, limit: limit.value };
    case "team":
      return { kind: "team", id: source.value.id, limit: limit.value };
    default: {
      const exhaustive: never = kind.value;
      return exhaustive;
    }
  }
});

function tournamentLabel(tournament: TournamentResult): string {
  return `${tournament.event.name} · ${tournament.name}`;
}

function matchLabel(match: TournamentMatchListItem): string {
  const [teamA, teamB] = match.participants;
  const teams = `${teamA?.team.name ?? t("newsTag.matchTbd")} – ${teamB?.team.name ?? t("newsTag.matchTbd")}`;
  return match.beginAt
    ? `${teams} · ${dateFormatter.value.format(new Date(match.beginAt))}`
    : teams;
}

async function resolveSource(initial: NewsMatchBlock): Promise<Selection | null> {
  if (initial.kind === "team") {
    const response = await apiFetch<{ team: Team | null }>(`/team/${initial.id}`);
    return response.team ? { id: initial.id, label: response.team.name } : null;
  }
  const key = newsMatchBlockKey(initial);
  const response = await apiFetch<MatchBlocksResponse>("/matches/blocks", {
    query: { block: key },
  });
  const tournament = response.blocks[key]?.[0]?.tournament;
  if (tournament) {
    return { id: tournament.id, label: tournamentLabel(tournament) };
  }
  return initial.kind === "tournament" ? { id: initial.id, label: initial.id } : null;
}

async function reset() {
  const initial = props.block;
  kind.value = initial?.kind ?? "match";
  limit.value =
    initial?.kind === "tournament" || initial?.kind === "team"
      ? initial.limit
      : NEWS_MATCH_BLOCK_DEFAULT_LIMIT;
  matchIds.value =
    initial?.kind === "match" ? [initial.id] : initial?.kind === "matches" ? [...initial.ids] : [];
  source.value = null;
  query.value = "";
  results.value = [];
  matches.value = [];
  if (initial) {
    source.value = await resolveSource(initial).catch(() => null);
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void reset();
    }
  },
);

watch(kind, (next, previous) => {
  if ((next === "team") !== (previous === "team")) {
    source.value = null;
    results.value = [];
    query.value = "";
  }
  if (next === "match") {
    matchIds.value = matchIds.value.slice(0, 1);
  }
});

watch([source, picksMatches], async ([selected, picking]) => {
  matches.value = [];
  if (!selected || !picking) {
    return;
  }
  loadingMatches.value = true;
  try {
    const response = await apiFetch<{ matches: TournamentMatchListItem[] }>(
      `/tournaments/${selected.id}/matches`,
    );
    matches.value = response.matches;
  } catch {
    matches.value = [];
  } finally {
    loadingMatches.value = false;
  }
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;

async function runSearch(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    results.value = [];
    return;
  }
  searching.value = true;
  try {
    if (searchesTeams.value) {
      const teams = await apiFetch<Team[]>("/search/teams", { query: { q: trimmed, limit: 10 } });
      results.value = teams.map((team) => ({ id: team.id, label: team.name }));
    } else {
      const tournaments = await apiFetch<TournamentResult[]>("/search/tournaments", {
        query: { q: trimmed, limit: 10 },
      });
      results.value = tournaments.map((tournament) => ({
        id: tournament.id,
        label: tournamentLabel(tournament),
      }));
    }
  } catch {
    results.value = [];
  } finally {
    searching.value = false;
  }
}

watch(query, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void runSearch(value);
  }, 250);
});

function choose(selection: Selection) {
  source.value = selection;
  matchIds.value = [];
  results.value = [];
  query.value = "";
}

function toggleMatch(id: string, checked: boolean | "indeterminate") {
  if (kind.value === "match") {
    matchIds.value = checked === true ? [id] : [];
    return;
  }
  matchIds.value =
    checked === true
      ? [...matchIds.value.filter((existing) => existing !== id), id]
      : matchIds.value.filter((existing) => existing !== id);
}

function canToggle(id: string): boolean {
  return (
    kind.value === "match" ||
    matchIds.value.includes(id) ||
    matchIds.value.length < NEWS_MATCH_BLOCK_MAX_MATCHES
  );
}

function confirm() {
  if (block.value) {
    emit("select", block.value);
  }
}

function close() {
  emit("update:open", false);
}
</script>

<template>
  <UModal
    :open="open"
    :title="
      props.block ? t('page.news.editor.matches.editTitle') : t('page.news.editor.matches.title')
    "
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <URadioGroup v-model="kind" orientation="horizontal" variant="table" :items="kindItems" />

        <UFormField
          :label="
            searchesTeams
              ? t('page.news.editor.matches.teamLabel')
              : t('page.news.editor.matches.tournamentLabel')
          "
        >
          <div v-if="source" class="flex items-center justify-between gap-3">
            <span class="truncate text-sm font-medium text-highlighted" translate="no">
              {{ source.label }}
            </span>
            <UButton
              size="xs"
              color="neutral"
              variant="subtle"
              :label="t('page.news.editor.matches.change')"
              @click="source = null"
            />
          </div>
          <div v-else class="flex flex-col gap-2">
            <UInput
              v-model="query"
              autofocus
              icon="i-lucide-search"
              :loading="searching"
              :placeholder="
                searchesTeams
                  ? t('page.news.editor.picker.placeholderTeam')
                  : t('page.news.editor.matches.tournamentPlaceholder')
              "
            />
            <ul v-if="results.length > 0" class="flex max-h-56 flex-col gap-1 overflow-y-auto">
              <li v-for="result in results" :key="result.id">
                <UButton
                  color="neutral"
                  variant="ghost"
                  class="w-full justify-start"
                  @click="choose(result)"
                >
                  <span class="truncate" translate="no">{{ result.label }}</span>
                </UButton>
              </li>
            </ul>
            <p v-else-if="query.trim() && !searching" class="text-sm text-muted">
              {{ t("page.news.editor.picker.empty") }}
            </p>
          </div>
        </UFormField>

        <UFormField
          v-if="source && picksMatches"
          :label="t('page.news.editor.matches.matchesLabel')"
          :hint="
            kind === 'matches'
              ? t('page.news.editor.matches.selected', {
                  count: matchIds.length,
                  max: NEWS_MATCH_BLOCK_MAX_MATCHES,
                })
              : undefined
          "
        >
          <div v-if="loadingMatches" class="flex flex-col gap-2" aria-busy="true">
            <USkeleton class="h-5 w-full" />
            <USkeleton class="h-5 w-4/5" />
          </div>
          <ul v-else-if="matches.length > 0" class="flex max-h-72 flex-col gap-2 overflow-y-auto">
            <li v-for="match in matches" :key="match.id">
              <UCheckbox
                :model-value="matchIds.includes(match.id)"
                :disabled="!canToggle(match.id)"
                :label="matchLabel(match)"
                @update:model-value="toggleMatch(match.id, $event)"
              />
            </li>
          </ul>
          <p v-else class="text-sm text-muted">{{ t("newsTag.matchesEmpty") }}</p>
        </UFormField>

        <UFormField
          v-if="source && !picksMatches"
          :label="t('page.news.editor.matches.limitLabel')"
          :hint="t('page.news.editor.matches.limitHint')"
        >
          <UInputNumber v-model="limit" :min="1" :max="NEWS_MATCH_BLOCK_MAX_MATCHES" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <UButton
        icon="i-fluent-trophy-24-regular"
        :label="
          props.block ? t('page.news.editor.matches.update') : t('page.news.editor.matches.insert')
        "
        :disabled="!block"
        @click="confirm"
      />
      <UButton color="neutral" variant="subtle" :label="t('common.cancel')" @click="close" />
    </template>
  </UModal>
</template>
