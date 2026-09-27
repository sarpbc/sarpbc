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
  <UPopover v-model:open="open" mode="hover" :open-delay="0" :close-delay="100">
    <NuxtLink
      :to="href"
      :target="opensInNewTab ? '_blank' : undefined"
      :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
      class="rounded-sm font-semibold! text-default! transition-none hover:text-highlighted! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      translate="no"
    >
      {{ label }}
    </NuxtLink>

    <template #content>
      <div v-if="pending" class="flex w-72 flex-col gap-3 p-3">
        <div class="flex items-center gap-3">
          <USkeleton class="size-10 shrink-0 rounded-none" />
          <USkeleton class="h-4 w-32" />
        </div>
        <div class="grid grid-cols-3 gap-2">
          <USkeleton v-for="index in 3" :key="index" class="aspect-3/2 w-full rounded-none" />
        </div>
      </div>

      <div v-else-if="error" class="w-72 p-3 text-sm text-muted">
        {{ t("newsTag.error") }}
      </div>

      <div v-else-if="team" class="flex w-72 flex-col gap-3 p-3">
        <div class="flex items-center gap-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center"
            :class="{ 'bg-elevated': !logoSrc }"
          >
            <img v-if="logoSrc" :src="logoSrc" :alt="team.name" class="size-full object-contain" />
            <UIcon v-else name="i-fluent-people-team-24-regular" class="size-5 text-muted" />
          </div>
          <p class="truncate font-semibold text-highlighted" translate="no">
            {{ team.name }}
          </p>
        </div>

        <ul v-if="roster.length > 0" class="grid grid-cols-3 gap-2">
          <li v-for="rosterPlayer in roster" :key="rosterPlayer.id" class="min-w-0">
            <NuxtLink
              :to="playerHref(rosterPlayer.slug)"
              :target="opensInNewTab ? '_blank' : undefined"
              :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
              class="flex flex-col gap-1 text-muted transition-none hover:text-highlighted"
            >
              <div
                class="flex aspect-3/2 w-full items-center justify-center overflow-hidden bg-elevated"
              >
                <img
                  v-if="rosterPlayer.imageUrl"
                  :src="rosterPlayer.imageUrl"
                  :alt="rosterPlayer.name"
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
