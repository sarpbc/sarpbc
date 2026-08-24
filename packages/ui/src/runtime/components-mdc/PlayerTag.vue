<script setup lang="ts">
import type { Player } from "@sarpbc/types";
import { fetchWithEntityTagCache } from "../composables/entityTagCache";
import { useEntityTagLink } from "../composables/useEntityTagLink";

const props = defineProps<{
  slug: string;
  label: string;
}>();

const { t } = useI18n();
const { playerHref, opensInNewTab } = useEntityTagLink();

const open = ref(false);
const pending = ref(false);
const error = ref(false);
const player = ref<Player | null>(null);

const href = computed(() => playerHref(props.slug));

const fullName = computed(() => {
  if (!player.value) {
    return null;
  }
  const parts = [player.value.firstName, player.value.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
});

async function loadPlayer() {
  if (player.value || pending.value) {
    return;
  }

  pending.value = true;
  error.value = false;

  try {
    const response = await fetchWithEntityTagCache(`player:${props.slug}`, () =>
      apiFetch<{ player: Player }>(`/player/slug/${encodeURIComponent(props.slug)}`),
    );
    player.value = response.player;
  } catch {
    error.value = true;
  } finally {
    pending.value = false;
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    void loadPlayer();
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
      <div v-if="pending" class="flex w-64 flex-col gap-3 p-3">
        <div class="flex items-center gap-3">
          <USkeleton class="size-12 shrink-0 rounded-full" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-3 w-32" />
          </div>
        </div>
        <USkeleton class="h-3 w-28" />
      </div>

      <div v-else-if="error" class="w-64 p-3 text-sm text-muted">
        {{ t("newsTag.error") }}
      </div>

      <div v-else-if="player" class="flex w-64 flex-col gap-3 p-3">
        <div class="flex items-center gap-3">
          <UAvatar
            :src="player.imageUrl ?? undefined"
            :alt="player.name"
            size="lg"
            icon="i-fluent-person-24-regular"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-highlighted" translate="no">
              {{ player.name }}
            </p>
            <p v-if="fullName" class="truncate text-sm text-muted">
              {{ fullName }}
            </p>
          </div>
        </div>

        <div v-if="player.team" class="flex items-center gap-2 border-t border-default pt-2">
          <UAvatar
            :src="player.team.imageUrl ?? undefined"
            :alt="player.team.name"
            size="xs"
            icon="i-fluent-people-team-24-regular"
          />
          <span class="truncate text-sm text-muted" translate="no">{{ player.team.name }}</span>
        </div>
        <p v-else class="border-t border-default pt-2 text-sm text-muted">
          {{ t("newsTag.noTeam") }}
        </p>

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
