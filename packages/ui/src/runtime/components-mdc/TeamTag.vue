<script setup lang="ts">
import type { Team } from "@sarpbc/types";
import { selectActiveRosterPlayers, resolveThemedLogoUrl } from "@sarpbc/utils";
import { fetchWithEntityTagCache } from "../composables/entityTagCache";
import { useEntityTagLink } from "../composables/useEntityTagLink";

const props = defineProps<{
  slug: string;
  label: string;
}>();

const { t } = useI18n();
const { teamHref, playerHref, opensInNewTab } = useEntityTagLink();

const open = ref(false);
const pending = ref(false);
const error = ref(false);
const team = ref<Team | null>(null);

const href = computed(() => teamHref(props.slug));

const roster = computed(() => selectActiveRosterPlayers(team.value?.players ?? []).slice(0, 3));

const colorMode = useColorMode();
const logoSrc = computed(() =>
  resolveThemedLogoUrl(team.value?.imageUrl, team.value?.darkModeImageUrl, colorMode.value),
);

async function loadTeam() {
  if (team.value || pending.value) {
    return;
  }

  pending.value = true;
  error.value = false;

  try {
    const response = await fetchWithEntityTagCache(`team:${props.slug}`, () =>
      apiFetch<{ team: Team }>(`/team/slug/${encodeURIComponent(props.slug)}`),
    );
    team.value = response.team;
  } catch {
    error.value = true;
  } finally {
    pending.value = false;
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    void loadTeam();
  }
});
</script>

<template>
  <UPopover
    v-model:open="open"
    mode="hover"
    :open-delay="0"
    :close-delay="100"
    :ui="{ content: 'rounded-none border border-default ring-0 shadow-sm overflow-hidden' }"
  >
    <NuxtLink
      :to="href"
      :target="opensInNewTab ? '_blank' : undefined"
      :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
      class="rounded-sm font-medium text-primary transition-none hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      translate="no"
    >
      {{ label }}
    </NuxtLink>

    <template #content>
      <div v-if="pending" class="flex w-72 flex-col" aria-busy="true">
        <div class="flex items-center gap-3 px-3 py-2">
          <USkeleton class="size-10 shrink-0 rounded-none" />
          <USkeleton class="h-4 w-32" />
        </div>
        <div class="grid grid-cols-3 border-t border-default">
          <div
            v-for="index in 3"
            :key="index"
            class="flex min-w-0 flex-col gap-2 border-r border-default p-2 last:border-r-0"
          >
            <USkeleton class="aspect-3/2 w-full rounded-none" />
            <USkeleton class="mx-auto h-4 w-12 rounded-none" />
          </div>
        </div>
      </div>

      <div v-else-if="error" class="w-72 p-3 text-sm text-muted">
        {{ t("newsTag.error") }}
      </div>

      <div v-else-if="team" class="flex w-72 flex-col">
        <div class="flex min-w-0 items-center gap-3 px-3 py-2">
          <div
            class="flex size-10 shrink-0 items-center justify-center"
            :class="{ 'bg-elevated': !logoSrc }"
          >
            <img v-if="logoSrc" :src="logoSrc" :alt="team.name" class="size-full object-contain" />
            <UIcon v-else name="i-fluent-people-team-24-regular" class="size-5 text-muted" />
          </div>
          <p class="truncate font-medium text-highlighted" translate="no">
            {{ team.name }}
          </p>
        </div>

        <ul v-if="roster.length > 0" class="grid grid-cols-3 border-t border-default">
          <li
            v-for="rosterPlayer in roster"
            :key="rosterPlayer.id"
            class="min-w-0 border-r border-default last:border-r-0"
          >
            <NuxtLink
              :to="playerHref(rosterPlayer.slug)"
              :target="opensInNewTab ? '_blank' : undefined"
              :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
              class="flex h-full min-w-0 flex-col gap-2 p-2 text-muted transition-none hover:bg-elevated hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <div
                class="flex aspect-3/2 w-full items-center justify-center overflow-hidden bg-elevated"
              >
                <img
                  v-if="rosterPlayer.imageUrl"
                  :src="rosterPlayer.imageUrl"
                  alt=""
                  class="size-full object-cover"
                />
                <UIcon v-else name="i-fluent-person-24-regular" class="size-5 text-muted" />
              </div>
              <span class="truncate text-center text-xs font-medium" translate="no">
                {{ rosterPlayer.name }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </template>
  </UPopover>
</template>
