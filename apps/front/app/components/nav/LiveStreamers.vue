<script lang="ts" setup>
import { useIntersectionObserver } from "@vueuse/core";
import type { LiveStreamer } from "~/types/streamer";

const { t, locale } = useI18n();
const { streamers, load } = useLiveStreamers();

const root = useTemplateRef("root");
const { stop } = useIntersectionObserver(
  root,
  ([entry]) => {
    if (!entry?.isIntersecting) return;
    stop();
    void load();
  },
  { rootMargin: "200px" },
);

const viewerFormatter = computed(
  () => new Intl.NumberFormat(locale.value, { notation: "compact", maximumFractionDigits: 1 }),
);
const viewerPlurals = computed(() => new Intl.PluralRules(locale.value));

function viewers(streamer: LiveStreamer): string {
  return t(
    "components.footer.live.viewers",
    { count: viewerFormatter.value.format(streamer.viewerCount) },
    viewerPlurals.value.select(streamer.viewerCount) === "one" ? 1 : 2,
  );
}

function linkLabel(streamer: LiveStreamer): string {
  return t("components.footer.live.linkLabel", {
    name: streamer.displayName,
    title: streamer.title,
    viewers: viewers(streamer),
  });
}
</script>

<template>
  <div ref="root">
    <section
      v-if="streamers.length > 0"
      class="flex flex-col gap-3 border-x border-t border-default bg-default p-4"
      :aria-label="$t('components.footer.live.title')"
    >
      <h2 class="flex items-center gap-2 text-xs font-medium text-toned">
        <SBadgeLiveDot />
        {{ $t("components.footer.live.title") }}
      </h2>
      <ul class="flex flex-wrap gap-x-6 gap-y-2">
        <li v-for="streamer in streamers" :key="streamer.login" class="min-w-0 max-w-full">
          <a
            :href="streamer.url"
            target="_blank"
            rel="noopener noreferrer"
            :title="streamer.title"
            :aria-label="linkLabel(streamer)"
            class="group flex min-w-0 items-baseline gap-2 text-xs"
          >
            <span class="shrink-0 font-medium text-highlighted group-hover:text-(--ui-link-hover)">
              {{ streamer.displayName }}
            </span>
            <span class="shrink-0 text-muted tabular-nums">{{ viewers(streamer) }}</span>
            <span class="hidden max-w-60 truncate text-dimmed sm:inline">{{ streamer.title }}</span>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>
