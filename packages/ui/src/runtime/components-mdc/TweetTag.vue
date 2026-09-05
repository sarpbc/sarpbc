<script setup lang="ts">
import { parseTweetUrl, type TweetEmbed } from "@sarpbc/utils";

const props = defineProps<{
  url: string;
}>();

const { t } = useI18n();
const parsed = computed(() => parseTweetUrl(props.url ?? ""));

const { data, status, error } = useAsyncData(
  `tweet-embed-${parsed.value?.id ?? "invalid"}`,
  async () => {
    if (!parsed.value) {
      return null;
    }

    return apiFetch<TweetEmbed>(`/news/embed/tweet?url=${encodeURIComponent(parsed.value.url)}`);
  },
  { watch: [() => props.url] },
);

const href = computed(() => data.value?.url ?? parsed.value?.url ?? props.url);
const showError = computed(() => !parsed.value || status.value === "error" || error.value);
</script>

<template>
  <span class="not-prose my-4 mx-auto block w-full max-w-xl">
    <span
      v-if="parsed && (status === 'pending' || status === 'idle')"
      class="flex flex-col gap-3 rounded-sm border border-default bg-default p-4"
    >
      <span class="flex items-center gap-2">
        <USkeleton class="size-8 shrink-0 rounded-full" />
        <span class="flex min-w-0 flex-1 flex-col gap-1.5">
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-3 w-20" />
        </span>
      </span>
      <USkeleton class="h-3 w-full" />
      <USkeleton class="h-3 w-5/6" />
      <USkeleton class="h-3 w-2/3" />
    </span>

    <a
      v-else-if="data"
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="flex flex-col gap-3 rounded-sm border border-default bg-default p-4 text-default no-underline transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      :aria-label="t('newsTag.tweetOnX', { name: data.authorName })"
    >
      <span class="flex items-start justify-between gap-3">
        <span class="min-w-0">
          <span class="block truncate font-medium text-highlighted" translate="no">
            {{ data.authorName }}
          </span>
          <span v-if="data.authorHandle" class="block truncate text-sm text-muted" translate="no">
            @{{ data.authorHandle }}
          </span>
        </span>
        <UIcon name="i-ri-twitter-x-fill" class="size-5 shrink-0 text-muted" />
      </span>

      <span class="whitespace-pre-wrap text-sm text-default" translate="no">{{ data.text }}</span>

      <span class="flex items-center justify-between gap-3 text-xs text-muted">
        <span v-if="data.postedAtLabel">{{ data.postedAtLabel }}</span>
        <span v-else />
        <span>{{ t("newsTag.viewOnX") }}</span>
      </span>
    </a>

    <a
      v-else-if="showError && href"
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-2 rounded-sm border border-default bg-default px-4 py-3 text-sm font-medium text-highlighted hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <UIcon name="i-ri-twitter-x-fill" class="size-4 shrink-0" />
      {{ t("newsTag.tweetUnavailable") }}
    </a>
  </span>
</template>
