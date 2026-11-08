<script lang="ts" setup>
import type { ProfileMatchListItem } from "@sarpbc/types";
import type { EntityKind, EntityTrophyListItem } from "~/types/entity";

const OVERVIEW_LIMIT = 6;

const { kind, pastMatches, trophies } = defineProps<{
  kind: EntityKind;
  pastMatches: ProfileMatchListItem[];
  trophies: EntityTrophyListItem[];
}>();

const { t, locale } = useI18n();
const mediumDate = computed(() => mediumDateFormatter(locale.value));

const recentMatches = computed(() => pastMatches.slice(0, OVERVIEW_LIMIT));
const recentTrophies = computed(() => trophies.slice(0, OVERVIEW_LIMIT));
</script>

<template>
  <div
    v-if="recentMatches.length > 0 || recentTrophies.length > 0"
    class="grid w-full gap-8 sm:grid-cols-2"
  >
    <SRail v-if="recentMatches.length > 0" :title="t('components.entity.overview.recentMatches')">
      <SCard>
        <MatchRow v-for="match in recentMatches" :key="match.id" :match="match" />
      </SCard>
    </SRail>
    <SRail v-if="recentTrophies.length > 0" :title="t(`page.${kind}.slug.trophies.title`)">
      <SCard>
        <SListItem
          v-for="trophy in recentTrophies"
          :key="trophy.id"
          :to="$localePath(trophy.path)"
          class="min-w-0 gap-3"
        >
          <span class="min-w-0 flex-1 truncate text-sm text-default group-hover:text-highlighted">
            {{ trophy.displayName }}
          </span>
          <time
            v-if="trophy.endAt"
            :datetime="new Date(trophy.endAt).toISOString()"
            class="shrink-0 text-xs text-muted tabular-nums"
          >
            {{ mediumDate.format(new Date(trophy.endAt)) }}
          </time>
        </SListItem>
      </SCard>
    </SRail>
  </div>
</template>
