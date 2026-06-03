<script lang="ts" setup>
import type { Player } from "~/types/player";
import type { Team } from "~/types/team";

const { t } = useI18n();

const isFocused = ref(false);
const inputRef = useTemplateRef("inputRef");

const open = ref(false);
const search = ref("");

const teamList = ref<Team[]>([]);
const playerList = ref<Player[]>([]);

let searchTimeout: NodeJS.Timeout | null = null;

async function updateSearch(value: string) {
  search.value = value;

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (search.value.length === 0) {
    teamList.value = [];
    playerList.value = [];
  } else {
    searchTimeout = setTimeout(async () => {
      await refreshSearch();
    }, 300);
  }

  handleFocus();
}

function handleFocus() {
  isFocused.value = true;
  open.value = teamList.value.length > 0 || playerList.value.length > 0 || search.value.length > 0;
}

function handleBlur(): void {
  isFocused.value = false;
  open.value = false;
}

function handleMouseDown(event: MouseEvent): void {
  event.preventDefault();
}

function handleLinkClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const link = target.closest("a");
  if (link) {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    search.value = "";
    teamList.value = [];
    playerList.value = [];
    open.value = false;
    inputRef.value?.blur();
  }
}

async function refreshSearch() {
  const { teams, players } = await searchTeamsAndPlayers({
    query: search.value,
  });
  teamList.value = teams;
  playerList.value = players;
}
</script>

<template>
  <UPopover v-model:open="open" :dismissible="false">
    <template #anchor>
      <InputSearch
        ref="inputRef"
        :search="search"
        :class="`${isFocused ? 'md:w-64' : 'md:w-48'} transition-all`"
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
        >
          {{ t("components.input.noResult") }}
        </div>
      </div>
    </template>
  </UPopover>
</template>
