<script lang="ts" setup>
defineProps<{
  name: string;
  slug: string;
  imageUrl?: string | null;
  nationality?: string | null;
  role?: string;
}>();
</script>

<template>
  <div class="flex min-w-0 flex-row items-center gap-3">
    <SLink :to="$localePath(`/player/${slug}`)" class="shrink-0">
      <PlayerImg :player-name="name" :img="imageUrl || undefined" size="sm" />
    </SLink>
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex min-w-0 flex-row items-center gap-1">
        <FlagIcon v-if="nationality" :nationality="nationality" class="shrink-0" />
        <SLink :to="$localePath(`/player/${slug}`)" variant="inline" class="truncate">
          {{ name }}
        </SLink>
      </div>
      <span v-if="role" class="text-sm text-muted">{{ role }}</span>
    </div>
  </div>
</template>
