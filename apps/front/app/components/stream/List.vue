<script setup lang="ts">
import type { Stream, StreamKind, StreamPlatform } from "@sarpbc/types";
import { orderStreams } from "@sarpbc/utils";
import { STARTGG_URL } from "~/composables/prizes";

const { streams, live = false } = defineProps<{
  streams: Stream[];
  live?: boolean;
}>();

const { t, locale } = useI18n();

const languageNames = computed(
  () => new Intl.DisplayNames([locale.value], { fallback: "code", type: "language" }),
);

const platformLabel = (platform: StreamPlatform): string => {
  switch (platform) {
    case "twitch": {
      return t("page.match.detail.watch.platforms.twitch");
    }

    case "youtube": {
      return t("page.match.detail.watch.platforms.youtube");
    }

    case "kick": {
      return t("page.match.detail.watch.platforms.kick");
    }

    case "other": {
      return t("page.match.detail.watch.platforms.other");
    }

    default: {
      const _exhaustive: never = platform;

      return _exhaustive;
    }
  }
};

const kindLabel = (kind: StreamKind): string => {
  switch (kind) {
    case "official": {
      return t("page.match.detail.watch.kinds.official");
    }

    case "costream": {
      return t("page.match.detail.watch.kinds.costream");
    }

    default: {
      const _exhaustive: never = kind;

      return _exhaustive;
    }
  }
};

const rows = computed(() =>
  orderStreams(streams, locale.value.slice(0, 2)).map((stream) => {
    const language = languageNames.value.of(stream.language) ?? stream.language;
    const platform = platformLabel(stream.platform);

    return {
      channel: stream.channel,
      details: [platform, language, kindLabel(stream.kind)].join(" · "),
      label: t("page.match.detail.watch.linkLabel", {
        channel: stream.channel,
        language,
        platform,
      }),
      url: stream.url,
    };
  }),
);

const hasStartgg = computed(() => streams.some((stream) => stream.source === "startgg"));
</script>

<template>
  <HubCard>
    <ul v-if="rows.length > 0" class="flex flex-col">
      <li v-for="row in rows" :key="row.url">
        <HubListItem
          :to="row.url"
          size="double"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="row.label"
          class="justify-between gap-4 text-sm"
        >
          <span class="flex min-w-0 flex-col justify-center">
            <span
              class="flex min-w-0 items-center gap-2 text-default group-hover:text-highlighted"
              translate="no"
            >
              <MatchLiveDot v-if="live" />
              <span class="truncate">{{ row.channel }}</span>
            </span>
            <span class="truncate text-xs text-muted">{{ row.details }}</span>
          </span>
          <Icon
            name="i-lucide-arrow-up-right"
            class="size-4 shrink-0 self-center text-muted"
            aria-hidden="true"
          />
        </HubListItem>
      </li>
    </ul>
    <HubListItem v-else class="text-sm text-muted">
      {{ t("page.match.detail.watch.noStream") }}
    </HubListItem>
    <p v-if="hasStartgg" class="flex h-row items-center px-2 text-xs text-muted">
      <span>
        {{ t("page.match.detail.watch.dataFrom") }}
        <SbLink :to="STARTGG_URL" external target="_blank" variant="inline">start.gg</SbLink>
      </span>
    </p>
  </HubCard>
</template>
