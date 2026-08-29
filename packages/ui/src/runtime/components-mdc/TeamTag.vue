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

const roster = computed(() => selectActiveRosterPlayers(team.value?.players ?? []));

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
  <UPopover v-model:open="open" mode="hover" :open-delay="150" :close-delay="100">
    <NuxtLink
      :to="href"
      :target="opensInNewTab ? '_blank' : undefined"
      :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
      class="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-sm font-medium text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      translate="no"
    >
      {{ label }}
    </NuxtLink>

    <template #content>
      <div v-if="pending" class="flex w-72 flex-col gap-3 p-3">
        <div class="flex items-center gap-3">
          <USkeleton class="size-10 shrink-0 rounded-sm" />
          <USkeleton class="h-4 w-32" />
        </div>
        <USkeleton class="h-3 w-full" />
        <USkeleton class="h-3 w-full" />
        <USkeleton class="h-3 w-2/3" />
      </div>

      <div v-else-if="error" class="w-72 p-3 text-sm text-muted">
        {{ t("newsTag.error") }}
      </div>

      <div v-else-if="team" class="flex w-72 flex-col gap-3 p-3">
        <div class="flex items-center gap-3">
          <UAvatar
            :src="logoSrc"
            :alt="team.name"
            size="md"
            icon="i-fluent-people-team-24-regular"
          />
          <p class="truncate font-semibold text-highlighted" translate="no">
            {{ team.name }}
          </p>
        </div>

        <div v-if="roster.length > 0" class="flex flex-col gap-2 border-t border-default pt-2">
          <p class="text-xs font-medium text-muted">
            {{ t("newsTag.roster") }}
          </p>
          <ul class="flex flex-col gap-1.5">
            <li v-for="rosterPlayer in roster" :key="rosterPlayer.id">
              <NuxtLink
                :to="playerHref(rosterPlayer.slug)"
                :target="opensInNewTab ? '_blank' : undefined"
                :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
                class="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-elevated"
              >
                <UAvatar
                  :src="rosterPlayer.imageUrl ?? undefined"
                  :alt="rosterPlayer.name"
                  size="xs"
                  icon="i-fluent-person-24-regular"
                />
                <span class="truncate text-sm text-highlighted" translate="no">
                  {{ rosterPlayer.name }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <NuxtLink
          :to="href"
          :target="opensInNewTab ? '_blank' : undefined"
          :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
          class="text-sm font-medium text-primary hover:underline"
        >
          {{ t("newsTag.viewProfile") }}
        </NuxtLink>
      </div>
    </template>
  </UPopover>
</template>
