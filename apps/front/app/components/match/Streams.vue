<script setup lang="ts">
import type { OfficialMatchStream } from "~/utils/officialStream";

const { streams, live } = defineProps<{
  streams: OfficialMatchStream[];
  live: boolean;
}>();

const { t, locale } = useI18n();

const languageNames = computed(() => new Intl.DisplayNames([locale.value], { type: "language" }));

const rows = computed(() =>
  streams
    .toSorted((a, b) => Number(b.main) - Number(a.main))
    .map((stream) => {
      const language = languageNames.value.of(stream.language) ?? stream.language;
      const source = new URL(stream.url).hostname.replace(/^www\./, "");
      return {
        url: stream.url,
        language,
        source,
        label: t("page.match.detail.watch.linkLabel", { source, language }),
      };
    }),
);
</script>

<template>
  <SCard>
    <ul v-if="rows.length > 0" class="flex flex-col">
      <li v-for="row in rows" :key="row.url">
        <SListItem
          :to="row.url"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="row.label"
          class="justify-between gap-4 text-sm"
        >
          <span class="flex min-w-0 items-center gap-2 text-default group-hover:text-highlighted">
            <SBadgeLiveDot v-if="live" />
            <span class="truncate first-letter:uppercase">{{ row.language }}</span>
          </span>
          <span class="flex shrink-0 items-center gap-1 text-muted">
            {{ row.source }}
            <UIcon name="i-lucide-arrow-up-right" class="size-4" aria-hidden="true" />
          </span>
        </SListItem>
      </li>
    </ul>
    <SListItem v-else class="text-sm text-muted">
      {{ t("page.match.detail.watch.noStream") }}
    </SListItem>
  </SCard>
</template>
