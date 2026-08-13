<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from "@nuxt/ui";
import { hasPermission } from "~/utils/staff";
import type { Player } from "~/types/player";
import type { Team } from "~/types/team";
import type { Tournament } from "~/types/tournament";

const { t } = useI18n();
const localePath = useLocalePath();
const user = useUser();

const open = ref(false);
const searchTerm = ref("");
const pending = ref(false);
const results = ref<AdminSearchResult>({ players: [], teams: [], tournaments: [] });
const refreshState = ref<"idle" | "loading" | "success" | "error">("idle");

const canPlayers = computed(() => hasPermission(user.value, "players.manage"));
const canTeams = computed(() => hasPermission(user.value, "teams.manage"));
const canTournaments = computed(() => hasPermission(user.value, "tournaments.manage"));
const canSearch = computed(() => canPlayers.value || canTeams.value || canTournaments.value);

defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => {
      if (!canSearch.value) {
        return;
      }
      open.value = !open.value;
    },
  },
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;

async function runSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    results.value = { players: [], teams: [], tournaments: [] };
    return;
  }

  pending.value = true;
  try {
    results.value = await searchAdminEntities(trimmed);
  } finally {
    pending.value = false;
  }
}

watch(searchTerm, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    void runSearch(value);
  }, 250);
});

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

function tournamentLabel(tournament: Tournament): string {
  const year = tournament.beginAt
    ? new Date(tournament.beginAt).getFullYear()
    : new Date().getFullYear();
  const league = tournament.league?.name ? `${tournament.league.name} ` : "";
  return `${league}${year} ${tournament.name}`.trim();
}

function closeAndGo(path: string) {
  open.value = false;
  void navigateTo(localePath(path));
}

function playerItems(): CommandPaletteItem[] {
  if (!canPlayers.value) {
    return [];
  }
  return results.value.players.map((player: Player) => ({
    id: `player-${player.id}`,
    label: player.name,
    suffix: player.team?.name,
    icon: "i-fluent-person-24-regular",
    avatar: player.imageUrl ? { src: player.imageUrl, alt: player.name } : undefined,
    onSelect() {
      closeAndGo(`/players/${player.id}`);
    },
  }));
}

function teamItems(): CommandPaletteItem[] {
  if (!canTeams.value) {
    return [];
  }
  return results.value.teams.map((team: Team) => ({
    id: `team-${team.id}`,
    label: team.name,
    suffix: team.location ?? undefined,
    icon: "i-fluent-people-team-24-regular",
    avatar: team.imageUrl ? { src: team.imageUrl, alt: team.name } : undefined,
    onSelect() {
      closeAndGo(`/teams/${team.id}`);
    },
  }));
}

function tournamentItems(): CommandPaletteItem[] {
  if (!canTournaments.value) {
    return [];
  }
  return results.value.tournaments.map((tournament: Tournament) => ({
    id: `tournament-${tournament.id}`,
    label: tournamentLabel(tournament),
    icon: "i-fluent-trophy-24-regular",
    avatar: tournament.imageUrl ? { src: tournament.imageUrl, alt: tournament.name } : undefined,
    onSelect() {
      closeAndGo(`/tournaments/${tournament.id}`);
    },
  }));
}

function refreshIcon(): string {
  switch (refreshState.value) {
    case "loading":
      return "i-fluent-arrow-sync-24-regular";
    case "success":
      return "i-fluent-checkmark-24-regular";
    case "error":
      return "i-fluent-dismiss-circle-24-regular";
    case "idle":
      return "i-fluent-arrow-sync-24-regular";
    default: {
      const _exhaustive: never = refreshState.value;
      return _exhaustive;
    }
  }
}

async function refreshEmptyTournaments(event?: Event) {
  event?.preventDefault();
  if (refreshState.value === "loading" || !canTournaments.value) {
    return;
  }

  refreshState.value = "loading";
  try {
    const emptyTournaments = await getTournamentsWithoutMatches();
    for (const tournament of emptyTournaments) {
      const success = await syncTournament(tournament.id);
      if (!success) {
        refreshState.value = "error";
        return;
      }
    }
    refreshState.value = "success";
  } catch {
    refreshState.value = "error";
  }
}

const groups = computed<CommandPaletteGroup[]>(() => {
  const items: CommandPaletteGroup[] = [];

  if (canTournaments.value) {
    items.push({
      id: "commands",
      label: t("page.search.commands"),
      items: [
        {
          id: "refresh-empty-tournaments",
          label: t("page.search.refreshEmptyTournaments"),
          suffix: t("page.search.refreshEmptyTournamentsHint"),
          icon: refreshIcon(),
          loading: refreshState.value === "loading",
          onSelect: (event: Event) => {
            void refreshEmptyTournaments(event);
          },
        },
      ],
    });
  }

  if (canPlayers.value && results.value.players.length > 0) {
    items.push({
      id: "players",
      label: t("page.search.players"),
      items: playerItems(),
      ignoreFilter: true,
    });
  }

  if (canTeams.value && results.value.teams.length > 0) {
    items.push({
      id: "teams",
      label: t("page.search.teams"),
      items: teamItems(),
      ignoreFilter: true,
    });
  }

  if (canTournaments.value && results.value.tournaments.length > 0) {
    items.push({
      id: "tournaments",
      label: t("page.search.tournaments"),
      items: tournamentItems(),
      ignoreFilter: true,
    });
  }

  return items;
});
</script>

<template>
  <UModal v-if="canSearch" v-model:open="open">
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-search"
      class="w-full max-w-sm justify-start"
      :label="$t('page.search.placeholder')"
    >
      <template #trailing>
        <div class="hidden items-center gap-0.5 sm:flex">
          <UKbd value="meta" size="sm" />
          <UKbd value="k" size="sm" />
        </div>
      </template>
    </UButton>

    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        :loading="pending"
        :placeholder="$t('page.search.inputPlaceholder')"
        :empty="$t('page.search.empty')"
        class="h-80"
      />
    </template>
  </UModal>
</template>
