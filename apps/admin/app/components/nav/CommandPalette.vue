<script setup lang="ts">
import { onKeyStroke, watchDebounced } from "@vueuse/core";
import type { CommandGroup, CommandItem } from "@sarpbc/design";
import { resolveThemedLogoUrl, tournamentStageLabel } from "@sarpbc/utils";
import { canAccessSection } from "~/utils/admin-sections";
import type { Player, Team } from "@sarpbc/types";

const { t } = useI18n();
const localePath = useLocalePath();
const user = useUser();
const colorMode = useColorMode();
const reportError = useReportError();

const open = ref(false);
const searchTerm = ref("");
const pending = ref(false);
const results = ref<AdminSearchResult>({ players: [], teams: [], tournaments: [] });
const refreshState = ref<"idle" | "loading" | "success" | "error">("idle");

const canPlayers = computed(() => canAccessSection(user.value, "/players"));
const canTeams = computed(() => canAccessSection(user.value, "/teams"));
const canTournaments = computed(() => canAccessSection(user.value, "/tournaments"));
const canSearch = computed(() => canPlayers.value || canTeams.value || canTournaments.value);

onKeyStroke(
  (event) => (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k",
  (event) => {
    if (!canSearch.value) {
      return;
    }

    event.preventDefault();
    open.value = !open.value;
  },
);

const runSearch = async (query: string) => {
  const trimmed = query.trim();

  if (!trimmed) {
    results.value = { players: [], teams: [], tournaments: [] };

    return;
  }

  pending.value = true;

  try {
    results.value = await searchAdminEntities(trimmed);
  } catch (searchError) {
    results.value = { players: [], teams: [], tournaments: [] };
    reportError(searchError);
  } finally {
    pending.value = false;
  }
};

watchDebounced(searchTerm, runSearch, { debounce: SEARCH_DEBOUNCE_MS });

watch(open, (isOpen) => {
  if (!isOpen) {
    searchTerm.value = "";
    results.value = { players: [], teams: [], tournaments: [] };

    if (refreshState.value !== "loading") {
      refreshState.value = "idle";
    }

    return;
  }

  if (refreshState.value !== "loading") {
    refreshState.value = "idle";
  }
});

const closeAndGo = (path: string) => {
  open.value = false;
  void navigateTo(localePath(path));
};

const playerItems = () => {
  if (!canPlayers.value) {
    return [];
  }

  return results.value.players.map((player: Player) => ({
    icon: "i-fluent-person-24-regular",
    id: `player-${player.id}`,
    image: player.imageUrl ?? undefined,
    label: player.name,
    onSelect() {
      closeAndGo(`/players/${player.id}`);
    },
    suffix: player.team?.name,
  }));
};

const teamItems = () => {
  if (!canTeams.value) {
    return [];
  }

  return results.value.teams.map((team: Team) => {
    const src = resolveThemedLogoUrl(team, colorMode.value);

    return {
      icon: "i-fluent-people-team-24-regular",
      id: `team-${team.id}`,
      image: src ?? undefined,
      label: team.name,
      onSelect() {
        closeAndGo(`/teams/${team.id}`);
      },
      suffix: team.location ?? undefined,
    };
  });
};

const tournamentItems = () => {
  if (!canTournaments.value) {
    return [];
  }

  return results.value.tournaments.map((tournament) => ({
    icon: "i-fluent-trophy-24-regular",
    id: `tournament-${tournament.id}`,
    image: tournament.imageUrl ?? undefined,
    label: tournamentStageLabel(tournament),
    onSelect() {
      closeAndGo(`/tournaments/${tournament.id}`);
    },
  }));
};

const refreshEmptyTournaments = async () => {
  if (refreshState.value === "loading" || !canTournaments.value) {
    return;
  }

  refreshState.value = "loading";

  try {
    const emptyTournaments = await getTournamentsWithoutMatches();

    await Promise.all(emptyTournaments.map(({ id }) => syncTournament(id)));

    refreshState.value = "success";
  } catch (refreshError) {
    refreshState.value = "error";
    reportError(refreshError);
  }
};

const groups = computed<CommandGroup[]>(() => {
  const items: CommandGroup[] = [];

  if (canTournaments.value) {
    items.push({
      id: "commands",
      items: [
        {
          icon: syncIcon(refreshState.value === "loading" ? "idle" : refreshState.value),
          id: "refresh-empty-tournaments",
          label: t("page.search.refreshEmptyTournaments"),
          loading: refreshState.value === "loading",
          onSelect: () => {
            void refreshEmptyTournaments();
          },
          suffix: t("page.search.refreshEmptyTournamentsHint"),
        },
      ],
      label: t("page.search.commands"),
    });
  }

  if (canPlayers.value && results.value.players.length > 0) {
    items.push({
      id: "players",
      items: playerItems(),
      label: t("page.search.players"),
      remote: true,
    });
  }

  if (canTeams.value && results.value.teams.length > 0) {
    items.push({
      id: "teams",
      items: teamItems(),
      label: t("page.search.teams"),
      remote: true,
    });
  }

  if (canTournaments.value && results.value.tournaments.length > 0) {
    items.push({
      id: "tournaments",
      items: tournamentItems(),
      label: t("page.search.tournaments"),
      remote: true,
    });
  }

  return items;
});
</script>

<template>
  <SModal v-if="canSearch" v-model:open="open" :title="$t('page.search.title')">
    <SButton
      variant="secondary"
      icon="i-lucide-search"
      class="w-full max-w-sm justify-start"
      :label="$t('page.search.placeholder')"
    >
      <template #trailing>
        <div class="hidden items-center gap-0.5 sm:flex">
          <SKbd value="meta" size="sm" />
          <SKbd value="k" size="sm" />
        </div>
      </template>
    </SButton>

    <template #content>
      <SCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        :loading="pending"
        :placeholder="$t('page.search.inputPlaceholder')"
        :empty="$t('page.search.empty')"
        class="h-80"
      />
    </template>
  </SModal>
</template>
