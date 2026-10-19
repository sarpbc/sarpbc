<script setup lang="ts">
import type { Player } from "@sarpbc/types";
import { resolveThemedLogoUrl } from "@sarpbc/utils";
import { fetchWithEntityTagCache } from "../composables/entityTagCache";
import { useEntityTagLink } from "../composables/useEntityTagLink";

const props = defineProps<{
  slug: string;
  label: string;
}>();

const { t } = useI18n();
const { playerHref, teamHref, opensInNewTab } = useEntityTagLink();

const open = ref(false);
const pending = ref(false);
const error = ref(false);
const player = ref<Player | null>(null);

const href = computed(() => playerHref(props.slug));

const colorMode = useColorMode();
const teamLogoSrc = computed(() =>
  resolveThemedLogoUrl(
    player.value?.team?.imageUrl,
    player.value?.team?.darkModeImageUrl,
    colorMode.value,
  ),
);

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
      apiFetch<{ player: Player | null }>(`/player/slug/${encodeURIComponent(props.slug)}`),
    );
    player.value = response.player;
    error.value = response.player === null;
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
      class="font-medium text-primary transition-none hover:text-highlighted"
      translate="no"
    >
      {{ label }}
    </NuxtLink>

    <template #content>
      <div v-if="pending" class="flex w-72 flex-col" aria-busy="true">
        <div class="flex items-center gap-3 p-3">
          <USkeleton class="size-16 shrink-0 rounded-none" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-3 w-32" />
          </div>
        </div>
        <div class="flex h-row items-center gap-2 border-t border-default px-3">
          <USkeleton class="size-5 shrink-0 rounded-none" />
          <USkeleton class="h-3 w-28" />
        </div>
        <div class="flex h-row items-center border-t border-default px-3">
          <USkeleton class="h-3 w-24" />
        </div>
      </div>

      <div v-else-if="error" class="w-72 p-3 text-sm text-muted">
        {{ t("newsTag.error") }}
      </div>

      <div v-else-if="player" class="flex w-72 flex-col">
        <div class="flex items-center gap-3 p-3">
          <div
            class="flex size-16 shrink-0 items-center justify-center overflow-hidden bg-elevated"
          >
            <img
              v-if="player.imageUrl"
              :src="player.imageUrl"
              alt=""
              class="size-full object-cover"
            />
            <UIcon v-else name="i-fluent-person-24-regular" class="size-6 text-muted" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-highlighted" translate="no">
              {{ player.name }}
            </p>
            <p v-if="fullName" class="truncate text-sm text-muted" translate="no">
              {{ fullName }}
            </p>
          </div>
        </div>

        <NuxtLink
          v-if="player.team"
          :to="teamHref(player.team.slug)"
          :target="opensInNewTab ? '_blank' : undefined"
          :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
          class="flex h-row min-w-0 items-center gap-2 border-t border-default px-3 text-muted transition-none hover:bg-elevated hover:text-highlighted"
        >
          <img
            v-if="teamLogoSrc"
            :src="teamLogoSrc"
            alt=""
            class="size-5 shrink-0 object-contain"
          />
          <UIcon v-else name="i-fluent-people-team-24-regular" class="size-5 shrink-0" />
          <span class="truncate text-sm" translate="no">{{ player.team.name }}</span>
        </NuxtLink>
        <p v-else class="flex h-row items-center border-t border-default px-3 text-sm text-muted">
          {{ t("newsTag.noTeam") }}
        </p>

        <NuxtLink
          :to="href"
          :target="opensInNewTab ? '_blank' : undefined"
          :rel="opensInNewTab ? 'noopener noreferrer' : undefined"
          class="flex h-row items-center justify-between gap-2 border-t border-default px-3 text-sm font-medium text-muted transition-none hover:bg-elevated hover:text-highlighted"
        >
          {{ t("newsTag.viewProfile") }}
          <UIcon name="i-fluent-chevron-right-24-regular" class="size-4 shrink-0" />
        </NuxtLink>
      </div>
    </template>
  </UPopover>
</template>
