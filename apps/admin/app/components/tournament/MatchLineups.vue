<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import type { SelectItem } from "@nuxt/ui";
import type {
  MatchLineupInput,
  MatchLineupsResponse,
  Player,
  TournamentDetailParticipant,
  TournamentMatchListItem,
} from "@sarpbc/types";
import { MAX_LINEUP_PLAYERS, participantName } from "@sarpbc/utils";

interface LineupPick {
  id: string;
  name: string;
}

const { match, label, participants } = defineProps<{
  match: TournamentMatchListItem;
  label: string;
  participants: TournamentDetailParticipant[];
}>();

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const lineups = ref<Record<string, LineupPick[]>>({});
const suggested = ref<MatchLineupInput[]>([]);
const knownNames = ref<Map<string, string>>(new Map());
const selectedPick = ref<Record<string, string | undefined>>({});
const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);

const query = ref("");
const searching = ref(false);
const results = ref<Player[]>([]);

const sides = computed(() =>
  match.participants.map((participant) => ({
    id: participant.id,
    name: participantName(participant),
  })),
);

const rosterIds = computed(
  () =>
    new Map(
      participants.map((participant) => [
        participant.id,
        new Set(participant.players.map((player) => player.id)),
      ]),
    ),
);

const taken = computed(
  () => new Set(Object.values(lineups.value).flatMap((picks) => picks.map((pick) => pick.id))),
);

const available = computed(() => results.value.filter((player) => !taken.value.has(player.id)));

const usableSuggestion = computed(() =>
  suggested.value.map((suggestion) => ({
    participantId: suggestion.participantId,
    picks: suggestion.playerIds.flatMap((id) => {
      const name = knownNames.value.get(id);

      return name ? [{ id, name }] : [];
    }),
  })),
);

const suggestedCount = computed(() =>
  suggested.value.reduce((total, suggestion) => total + suggestion.playerIds.length, 0),
);

const unnamedSuggestedCount = computed(
  () =>
    suggestedCount.value -
    usableSuggestion.value.reduce((total, suggestion) => total + suggestion.picks.length, 0),
);

function sideOf(participantId: string): LineupPick[] {
  return lineups.value[participantId] ?? [];
}

function isFull(participantId: string): boolean {
  return sideOf(participantId).length >= MAX_LINEUP_PLAYERS;
}

function isStandIn(participantId: string, playerId: string): boolean {
  return !rosterIds.value.get(participantId)?.has(playerId);
}

function rosterOptions(participantId: string): SelectItem[][] {
  const own = participants.filter((participant) => participant.id === participantId);
  const others = participants.filter((participant) => participant.id !== participantId);

  return [...own, ...others].flatMap((participant): SelectItem[][] => {
    const players = participant.players.filter((player) => !taken.value.has(player.id));

    if (players.length === 0) {
      return [];
    }

    return [
      [
        { type: "label", label: participantName(participant) },
        ...players.map((player) => ({ value: player.id, label: player.name })),
      ],
    ];
  });
}

function rememberNames(picks: LineupPick[]) {
  const names = new Map(knownNames.value);

  for (const pick of picks) {
    names.set(pick.id, pick.name);
  }

  knownNames.value = names;
}

function apply(response: MatchLineupsResponse) {
  const rosterPicks = participants.flatMap((participant) => participant.players);
  const lineupPicks = response.lineups.flatMap((lineup) => lineup.players);
  knownNames.value = new Map();
  rememberNames([...rosterPicks, ...lineupPicks]);
  lineups.value = Object.fromEntries(
    response.lineups.map((lineup) => [
      lineup.participantId,
      lineup.players.map(({ id, name }) => ({ id, name })),
    ]),
  );
  suggested.value = response.suggested;
  selectedPick.value = {};
}

async function load() {
  loading.value = true;
  loadFailed.value = false;

  try {
    apply(await getMatchLineups(match.id));
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      void load();
    }
  },
  { immediate: true },
);

async function runSearch(searchQuery: string) {
  const trimmed = searchQuery.trim();

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
}

watchDebounced(query, runSearch, { debounce: SEARCH_DEBOUNCE_MS });

function add(participantId: string, pick: LineupPick) {
  if (taken.value.has(pick.id) || isFull(participantId)) {
    return;
  }

  rememberNames([pick]);
  lineups.value = { ...lineups.value, [participantId]: [...sideOf(participantId), pick] };
}

function addFromRoster(participantId: string) {
  const playerId = selectedPick.value[participantId];
  const name = playerId ? knownNames.value.get(playerId) : undefined;

  if (!playerId || !name) {
    return;
  }

  add(participantId, { id: playerId, name });
  selectedPick.value = { ...selectedPick.value, [participantId]: undefined };
}

function addFromSearch(participantId: string, player: Player) {
  add(participantId, { id: player.id, name: player.name });
}

function remove(participantId: string, playerId: string) {
  lineups.value = {
    ...lineups.value,
    [participantId]: sideOf(participantId).filter((pick) => pick.id !== playerId),
  };
}

function fillFromRoster(participantId: string) {
  const otherIds = new Set(
    Object.entries(lineups.value)
      .filter(([id]) => id !== participantId)
      .flatMap(([, picks]) => picks.map((pick) => pick.id)),
  );

  const roster = participants.find((participant) => participant.id === participantId);
  lineups.value = {
    ...lineups.value,
    [participantId]: (roster?.players ?? [])
      .filter((player) => !otherIds.has(player.id))
      .slice(0, MAX_LINEUP_PLAYERS)
      .map(({ id, name }) => ({ id, name })),
  };
}

function hasRoster(participantId: string): boolean {
  return (rosterIds.value.get(participantId)?.size ?? 0) > 0;
}

function fillFromSuggestion() {
  lineups.value = Object.fromEntries(
    usableSuggestion.value.map((suggestion) => [
      suggestion.participantId,
      suggestion.picks.slice(0, MAX_LINEUP_PLAYERS),
    ]),
  );
}

async function save() {
  saving.value = true;

  try {
    apply(
      await setMatchLineups(
        match.id,
        sides.value.map((side) => ({
          participantId: side.id,
          playerIds: sideOf(side.id).map((pick) => pick.id),
        })),
      ),
    );
    toast.add({ title: t("page.tournaments.lineups.saved"), color: "success" });
    open.value = false;
  } catch (error) {
    reportError(error, t("page.tournaments.lineups.saveError"));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('page.tournaments.lineups.title', { match: label })"
    :description="t('page.tournaments.lineups.description', { max: MAX_LINEUP_PLAYERS })"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <template #body>
      <p v-if="loading" class="text-sm text-muted" aria-live="polite">
        {{ t("page.tournaments.lineups.loading") }}
      </p>

      <div v-else-if="loadFailed" class="flex flex-col items-start gap-2">
        <p class="text-sm text-error">{{ t("page.tournaments.lineups.loadError") }}</p>
        <UButton size="sm" variant="soft" :label="t('common.retry')" @click="load" />
      </div>

      <div v-else class="flex flex-col gap-4">
        <div
          v-if="suggestedCount > 0"
          class="flex flex-col gap-2 border border-default p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-col gap-0.5 text-sm">
            <p>{{ t("page.tournaments.lineups.suggestedHint") }}</p>
            <p v-if="unnamedSuggestedCount > 0" class="text-muted">
              {{
                t(
                  "page.tournaments.lineups.suggestedUnnamed",
                  { count: unnamedSuggestedCount },
                  unnamedSuggestedCount,
                )
              }}
            </p>
          </div>
          <UButton
            size="sm"
            variant="soft"
            icon="i-fluent-arrow-sync-24-regular"
            :label="t('page.tournaments.lineups.fillSuggested')"
            :disabled="unnamedSuggestedCount === suggestedCount"
            @click="fillFromSuggestion"
          />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section
            v-for="side in sides"
            :key="side.id"
            class="flex flex-col gap-3 border border-default p-3"
            :aria-label="side.name"
          >
            <div class="flex items-center justify-between gap-2">
              <h3 class="truncate text-sm font-medium text-highlighted">{{ side.name }}</h3>
              <span class="shrink-0 text-xs text-muted tabular-nums">
                {{ sideOf(side.id).length }}/{{ MAX_LINEUP_PLAYERS }}
              </span>
            </div>

            <ol v-if="sideOf(side.id).length > 0" class="divide-y divide-default">
              <li
                v-for="pick in sideOf(side.id)"
                :key="pick.id"
                class="flex items-center justify-between gap-2 py-1 text-sm"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="truncate">{{ pick.name }}</span>
                  <UBadge
                    v-if="isStandIn(side.id, pick.id)"
                    color="warning"
                    variant="subtle"
                    size="sm"
                    class="shrink-0"
                  >
                    {{ t("page.tournaments.lineups.standIn") }}
                  </UBadge>
                </span>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-fluent-dismiss-24-regular"
                  :aria-label="t('page.tournaments.lineups.remove', { name: pick.name })"
                  @click="remove(side.id, pick.id)"
                />
              </li>
            </ol>
            <p v-else class="text-sm text-muted">{{ t("page.tournaments.lineups.empty") }}</p>

            <form class="flex items-center gap-2" @submit.prevent="addFromRoster(side.id)">
              <USelect
                v-model="selectedPick[side.id]"
                :items="rosterOptions(side.id)"
                value-key="value"
                label-key="label"
                class="min-w-0 flex-1"
                :placeholder="t('page.tournaments.lineups.choose')"
                :aria-label="t('page.tournaments.lineups.chooseFor', { name: side.name })"
                :disabled="isFull(side.id)"
              />
              <UButton
                type="submit"
                size="sm"
                variant="soft"
                :label="t('page.tournaments.lineups.add')"
                :disabled="!selectedPick[side.id] || isFull(side.id)"
              />
            </form>

            <UButton
              v-if="hasRoster(side.id)"
              size="xs"
              color="neutral"
              variant="ghost"
              class="self-start"
              :label="t('page.tournaments.lineups.useRoster')"
              @click="fillFromRoster(side.id)"
            />
          </section>
        </div>

        <div class="flex flex-col gap-2">
          <UInput
            v-model="query"
            class="w-full"
            :placeholder="t('page.tournaments.lineups.search')"
            :aria-label="t('page.tournaments.lineups.search')"
            :loading="searching"
            autocomplete="off"
          />
          <div
            v-if="query.trim() && !searching"
            class="max-h-56 overflow-y-auto overscroll-contain"
          >
            <ul v-if="available.length > 0" class="divide-y divide-default">
              <li
                v-for="player in available"
                :key="player.id"
                class="flex flex-col gap-1 py-1 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span class="truncate">{{ player.name }}</span>
                <div class="flex flex-wrap gap-1">
                  <UButton
                    v-for="side in sides"
                    :key="side.id"
                    size="xs"
                    variant="ghost"
                    icon="i-fluent-add-24-regular"
                    :label="t('page.tournaments.lineups.addTo', { name: side.name })"
                    :disabled="isFull(side.id)"
                    @click="addFromSearch(side.id, player)"
                  />
                </div>
              </li>
            </ul>
            <p v-else class="text-sm text-muted">{{ t("page.tournaments.lineups.searchEmpty") }}</p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-row justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('common.cancel')"
          @click="open = false"
        />
        <UButton
          :label="t('page.tournaments.lineups.save')"
          :loading="saving"
          :disabled="loading || loadFailed"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
