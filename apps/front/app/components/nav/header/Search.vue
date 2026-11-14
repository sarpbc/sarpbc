<script lang="ts" setup>
import type { Player, Team } from "@sarpbc/types";
import { useTimeoutFn } from "@vueuse/core";

const { t } = useI18n();

const inputRef = useTemplateRef("inputRef");

const open = ref(false);
const search = ref("");
const searching = ref(false);

const teamList = ref<Team[]>([]);
const teamQuery = ref("");
const playerList = ref<Player[]>([]);

const DEBOUNCE_MS = 150;

let latestRequest = 0;

const pendingSearch = useTimeoutFn(refreshSearch, DEBOUNCE_MS, { immediate: false });

function resetResults() {
  pendingSearch.stop();
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
    searching.value = true;
    pendingSearch.start();
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
  if (event.target instanceof Element && event.target.closest("a")) {
    search.value = "";
    resetResults();
    open.value = false;
    inputRef.value?.blur();
  }
}

async function refreshSearch() {
  const request = ++latestRequest;
  const query = search.value;
  const { teams, players } = await searchTeamsAndPlayers({ query });

  // A newer keystroke or a cleared field owns the results now.
  if (request !== latestRequest) {
    return;
  }

  teamList.value = teams;
  teamQuery.value = query;
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

        <TeamList :teams="teamList" :title="t('general.teams')" :query="teamQuery" />

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
