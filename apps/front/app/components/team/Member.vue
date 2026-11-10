<script lang="ts" setup>
import { playerPath, staffPath } from "@sarpbc/utils";

const { slug, staff = false } = defineProps<{
  name: string;
  slug: string;
  imageUrl?: string | null;
  nationality?: string | null;
  role?: string;
  staff?: boolean;
}>();

const profilePath = computed(() => (staff ? staffPath(slug) : playerPath(slug)));
</script>

<template>
  <div class="flex min-w-0 flex-row items-center gap-3">
    <SLink :to="$localePath(profilePath)" class="shrink-0">
      <PlayerImg :player-name="name" :img="imageUrl || undefined" size="sm" />
    </SLink>
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex min-w-0 flex-row items-center gap-1">
        <FlagIcon v-if="nationality" :nationality="nationality" class="shrink-0" />
        <SLink :to="$localePath(profilePath)" variant="inline" class="truncate">
          {{ name }}
        </SLink>
      </div>
      <span v-if="role" class="text-sm text-muted">{{ role }}</span>
    </div>
  </div>
</template>
