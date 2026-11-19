<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useDesignAdapters } from "../adapters.ts";

import type { AvatarSize } from "../types.ts";

const {
  alt,
  icon = null,
  size = "sm",
  src = null,
} = defineProps<{
  alt: string;
  icon?: string | null;
  size?: AvatarSize;
  src?: string | null;
}>();

const adapters = useDesignAdapters();
const failed = ref(false);

watch(
  () => src,
  () => {
    failed.value = false;
  },
);

const showImage = computed(() => src !== null && src !== "" && !failed.value);

const initials = computed(() =>
  alt
    .split(/\s+/u)
    .filter((word) => word !== "")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join(""),
);
</script>

<template>
  <span class="sb-avatar" :data-size="size">
    <img
      v-if="showImage"
      :src="src ?? undefined"
      :alt="alt"
      class="sb-avatar__image"
      @error="failed = true"
    />
    <component :is="adapters.icon" v-else-if="icon !== null" :name="icon" class="sb-avatar__icon" />
    <span v-else class="sb-avatar__initials" aria-hidden="true">{{ initials }}</span>
  </span>
</template>

<style scoped>
@layer components {
  .sb-avatar {
    --size: 1.75rem;

    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: var(--size);
    height: var(--size);
    overflow: hidden;
    background: var(--sb-bg-elevated);
    color: var(--sb-text-muted);
    font-size: calc(var(--size) * 0.4);
    font-weight: 500;
    vertical-align: middle;
  }

  .sb-avatar[data-size="xs"] {
    --size: 1.5rem;
  }

  .sb-avatar[data-size="lg"] {
    --size: 2.5rem;
  }

  .sb-avatar__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .sb-avatar__icon {
    width: 60%;
    height: 60%;
  }
}
</style>
