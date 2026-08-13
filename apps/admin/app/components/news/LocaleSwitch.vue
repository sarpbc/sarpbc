<script setup lang="ts">
const locale = defineModel<"en" | "fr">({ required: true });

defineProps<{
  missingFrench?: boolean;
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 px-4">
    <div class="flex items-center gap-1">
      <UButton
        size="sm"
        :color="locale === 'en' ? 'primary' : 'neutral'"
        :variant="locale === 'en' ? 'solid' : 'ghost'"
        class="cursor-pointer"
        @click="locale = 'en'"
      >
        {{ $t("page.news.locale.en") }}
      </UButton>
      <UButton
        size="sm"
        :color="locale === 'fr' ? 'primary' : 'neutral'"
        :variant="locale === 'fr' ? 'solid' : 'ghost'"
        class="cursor-pointer"
        @click="locale = 'fr'"
      >
        {{ $t("page.news.locale.fr") }}
      </UButton>
    </div>
    <p v-if="missingFrench" class="text-xs text-muted">
      {{ $t("page.news.locale.fallbackHint") }}
    </p>
  </div>
</template>
