<script lang="ts" setup>
import type { Player } from "~/types/player";
import type { Team } from "~/types/team";

const { t } = useI18n();

const inputRef = useTemplateRef("inputRef");

const open = ref(false);
const search = ref("");
const searching = ref(false);

const teamList = ref<Team[]>([]);
const playerList = ref<Player[]>([]);

const DEBOUNCE_MS = 150;

let searchTimeout: NodeJS.Timeout | null = null;
let latestRequest = 0;

function resetResults() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  latestRequest++;
  searching.value = false;
  teamList.value = [];
  playerList.value = [];
}

function updateSearch(value: string) {
  search.value = value;

  if (search.value.length === 0) {
    resetResults();
  } else {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searching.value = true;
    searchTimeout = setTimeout(refreshSearch, DEBOUNCE_MS);
  }

  handleFocus();
}

function handleFocus() {
  open.value = teamList.value.length > 0 || playerList.value.length > 0 || search.value.length > 0;
}

function handleBlur(): void {
  open.value = false;
}

function handleMouseDown(event: MouseEvent): void {
  event.preventDefault();
}

function handleLinkClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  if (target.closest("a")) {
    search.value = "";
    resetResults();
    open.value = false;
    inputRef.value?.blur();
  }
}

async function refreshSearch() {
  const request = ++latestRequest;
  const { teams, players } = await searchTeamsAndPlayers({
    query: search.value,
  });
  // A newer keystroke or a cleared field owns the results now.
  if (request !== latestRequest) {
    return;
  }
  teamList.value = teams;
  playerList.value = players;
  searching.value = false;
}
</script>

<template>
  <UPopover v-model:open="open" :dismissible="false">
    <template #anchor>
      <InputSearch
        ref="inputRef"
        :search="search"
        class="md:w-48 lg:w-64"
        @update:search="updateSearch"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </template>
    <template #content>
      <div
        class="w-48 lg:w-64 flex flex-col p-4 gap-2"
        @mousedown="handleMouseDown"
        @click="handleLinkClick"
      >
        <PlayerList :players="playerList" :title="t('general.players')" />

        <TeamList :teams="teamList" :title="t('general.teams')" />

        <div
          v-if="search.length > 0 && teamList.length === 0 && playerList.length === 0"
          class="text-muted text-sm text-center py-4"
          :role="searching ? 'status' : undefined"
        >
          {{ searching ? t("components.input.searching") : t("components.input.noResult") }}
        </div>
      </div>
    </template>
  </UPopover>
</template>
