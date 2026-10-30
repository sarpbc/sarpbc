<script setup lang="ts">
import { parseTweetUrl, tweetImageProxyPath, type TweetEmbed } from "@sarpbc/utils";

const props = defineProps<{
  url: string;
}>();

const { t, locale } = useI18n();
const config = useRuntimeConfig();
const parsed = computed(() => parseTweetUrl(props.url ?? ""));

const { data, status, error } = useAsyncData(
  computed(() => `tweet-embed-${parsed.value?.id ?? "invalid"}`),
  async () => {
    if (!parsed.value) {
      return null;
    }

    return apiFetch<TweetEmbed>(`/news/embed/tweet?url=${encodeURIComponent(parsed.value.url)}`);
  },
);

function imageSrc(url: string): string {
  const path = tweetImageProxyPath(url);
  // This URL is written into the page for the browser. Server fetches use useApiBase().
  return path ? `${config.public.apiBase}${path}` : url;
}

const href = computed(() => data.value?.url ?? parsed.value?.url ?? props.url);
const showError = computed(() => !parsed.value || status.value === "error" || error.value);
const postedAtLabel = computed(() =>
  data.value
    ? new Intl.DateTimeFormat(locale.value, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(data.value.postedAt))
    : "",
);
</script>

<template>
  <span class="not-prose my-4 block w-full min-w-0">
    <span
      v-if="parsed && (status === 'pending' || status === 'idle')"
      class="flex flex-col border border-default bg-default"
      aria-busy="true"
    >
      <span class="flex items-center gap-3 px-3 py-2">
        <USkeleton class="size-10 shrink-0 rounded-none" />
        <span class="flex min-w-0 flex-1 flex-col gap-1.5">
          <USkeleton class="h-4 w-32" />
          <USkeleton class="h-3 w-20" />
        </span>
      </span>
      <span class="flex flex-col gap-2 border-t border-default p-3">
        <USkeleton class="h-3 w-full" />
        <USkeleton class="h-3 w-5/6" />
        <USkeleton class="h-3 w-2/3" />
      </span>
      <span class="flex h-row items-center justify-between gap-3 border-t border-default px-3">
        <USkeleton class="h-3 w-24" />
        <USkeleton class="h-3 w-16" />
      </span>
    </span>

    <span
      v-else-if="data"
      class="flex min-w-0 flex-col overflow-hidden border border-default bg-default text-default"
      role="group"
      :aria-label="t('newsTag.tweetOnX', { name: data.authorName })"
    >
      <span class="flex min-w-0 items-center justify-between gap-3 px-3 py-2">
        <a
          :href="data.authorUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex min-w-0 items-center gap-3"
        >
          <img
            v-if="data.authorImageUrl"
            :src="imageSrc(data.authorImageUrl)"
            alt=""
            referrerpolicy="no-referrer"
            width="40"
            height="40"
            loading="lazy"
            class="size-10 shrink-0 object-cover"
          />
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium text-highlighted" translate="no">
              {{ data.authorName }}
            </span>
            <span v-if="data.authorHandle" class="block truncate text-sm text-muted" translate="no">
              @{{ data.authorHandle }}
            </span>
          </span>
        </a>
        <UIcon name="i-ri-twitter-x-fill" class="size-4 shrink-0 text-muted" />
      </span>

      <span
        v-if="data.text"
        class="border-t border-default p-3 text-sm leading-6 wrap-anywhere whitespace-pre-wrap text-default"
        translate="no"
        >{{ data.text }}</span
      >

      <span
        v-if="data.media.length"
        class="grid gap-px border-t border-default bg-border"
        :class="data.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
      >
        <a
          v-for="(media, index) in data.media"
          :key="media.url"
          :href="href"
          target="_blank"
          rel="noopener noreferrer"
          class="relative flex min-w-0 items-center justify-center bg-elevated"
          :class="{ 'col-span-2': data.media.length === 3 && index === 0 }"
        >
          <img
            :src="imageSrc(media.url)"
            :alt="media.alt || t('newsTag.tweetImage', { index: index + 1 })"
            :width="media.width"
            :height="media.height"
            loading="lazy"
            referrerpolicy="no-referrer"
            class="block w-full object-contain"
            :class="data.media.length > 1 ? 'aspect-square' : 'max-h-96'"
          />
          <span
            v-if="media.type !== 'photo'"
            class="absolute flex size-10 items-center justify-center border border-default bg-default text-highlighted"
            :aria-label="t('newsTag.viewOnX')"
          >
            <UIcon name="i-fluent-play-24-filled" class="size-5" />
          </span>
        </a>
      </span>

      <span
        class="flex h-row items-center justify-between gap-3 border-t border-default pl-3 text-xs text-muted"
      >
        <time :datetime="data.postedAt">{{ postedAtLabel }}</time>
        <a
          :href="href"
          target="_blank"
          rel="noopener noreferrer"
          class="flex h-full items-center gap-2 border-l border-default px-3 text-muted transition-none hover:bg-elevated hover:text-highlighted"
        >
          {{ t("newsTag.viewOnX") }}
          <UIcon name="i-fluent-arrow-up-right-24-regular" class="size-4 shrink-0" />
        </a>
      </span>
    </span>

    <a
      v-else-if="showError && href"
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="flex min-h-row items-center gap-2 border border-default bg-default px-3 py-2 text-sm font-medium text-muted transition-none hover:bg-elevated hover:text-highlighted"
    >
      <UIcon name="i-ri-twitter-x-fill" class="size-4 shrink-0" />
      {{ t("newsTag.tweetUnavailable") }}
    </a>
  </span>
</template>
