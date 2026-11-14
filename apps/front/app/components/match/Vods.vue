<script setup lang="ts">
import type { MatchVod, MatchVodSource } from "@sarpbc/types";

const { vods } = defineProps<{ vods: MatchVod[] }>();

const { t, locale } = useI18n();

const games = computed(() => {
  const byGame = new Map<number, MatchVod[]>();

  for (const vod of vods) byGame.set(vod.game, [...(byGame.get(vod.game) ?? []), vod]);

  return [...byGame.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([game, links]) => ({ game, links }));
});

const languageNames = computed(() => new Intl.DisplayNames([locale.value], { type: "language" }));

function sourceLabel(source: MatchVodSource): string {
  switch (source) {
    case "twitch":
      return t("page.match.detail.vods.sources.twitch");
    case "youtube":
      return t("page.match.detail.vods.sources.youtube");
    default: {
      const exhaustive: never = source;

      return exhaustive;
    }
  }
}

function linkLabel(vod: MatchVod): string {
  return t("page.match.detail.vods.linkLabel", {
    game: vod.game,
    source: sourceLabel(vod.source),
    language: languageNames.value.of(vod.language) ?? vod.language,
  });
}
</script>

<template>
  <SCard>
    <ul v-if="games.length > 0" class="flex flex-col">
      <li
        v-for="{ game, links } in games"
        :key="game"
        class="flex min-h-row flex-wrap items-center gap-x-4 gap-y-1 px-2 py-2 text-sm"
      >
        <span class="w-16 shrink-0 text-default tabular-nums">
          {{ t("page.match.detail.vods.game", { number: game }) }}
        </span>
        <ul class="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
          <li v-for="vod in links" :key="vod.url">
            <SLink
              :to="vod.url"
              external
              target="_blank"
              rel="noopener noreferrer"
              variant="muted"
              :aria-label="linkLabel(vod)"
              class="inline-flex items-center gap-1"
            >
              {{ sourceLabel(vod.source) }} · {{ vod.language.toUpperCase() }}
              <UIcon name="i-lucide-arrow-up-right" class="size-4" aria-hidden="true" />
            </SLink>
          </li>
        </ul>
      </li>
    </ul>
    <SListItem v-else class="text-sm text-muted">
      {{ t("page.match.detail.watch.noReplay") }}
    </SListItem>
  </SCard>
</template>
