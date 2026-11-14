<script lang="ts" setup>
import type { SeasonArchive, SeasonArchiveAward } from "@sarpbc/types";
import { teamPath, tournamentStagePath } from "@sarpbc/utils";

const route = useRoute();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const { seasonAwardTypeLabel } = usePlayerAwardLabels();

const slug = computed(() => String(route.params.slug));

const { data: season, error } = await useAsyncData<SeasonArchive | null>(
  () => `season-archive-${slug.value}`,
  () => getSeasonArchive(slug.value),
  { watch: [slug], default: () => null },
);

if (!season.value) {
  throwEntityLoadError(error.value, {
    notFound: t("page.seasons.archive.notFound"),
    failed: t("page.seasons.archive.error"),
  });
}

const awardTitle = (award: SeasonArchiveAward): string => {
  const type = seasonAwardTypeLabel(award.awardType);

  return award.region ? `${type} · ${award.region}` : type;
};

const awardMeta = (award: SeasonArchiveAward): string =>
  [
    award.presentedBy
      ? t("page.seasons.archive.awards.presentedBy", { name: award.presentedBy })
      : null,
    t("page.seasons.archive.awards.officialSource"),
  ]
    .filter(Boolean)
    .join(" · ");

watch(
  season,
  (current) => {
    setPageSeo({
      title: current
        ? t("page.seasons.archive.seoTitle", { name: current.name })
        : t("page.seasons.index.seoTitle"),
      description: current
        ? t("page.seasons.archive.seoDescription", { name: current.name })
        : t("page.seasons.index.description"),
    });
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="season" class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ season.name }}</template>
      <template #meta>
        <SLink :to="$localePath('/seasons')" variant="muted">
          {{ t("page.seasons.archive.allSeasons") }}
        </SLink>
      </template>
    </SHubPageHeader>

    <section aria-labelledby="season-winner-title">
      <SRail>
        <template #caption>
          <h2 id="season-winner-title">{{ t("page.seasons.archive.winner.title") }}</h2>
        </template>
        <SCard v-if="season.winner">
          <SListItem :to="$localePath(teamPath(season.winner.slug))" class="min-w-0 gap-2">
            <UIcon
              name="i-fluent-trophy-24-filled"
              class="size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <TeamImg :team-name="season.winner.name" :logo="season.winner" size="sm" />
            <span class="truncate text-sm font-medium text-highlighted" translate="no">
              {{ season.winner.name }}
            </span>
          </SListItem>
        </SCard>
        <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
          <SEmptyState
            icon="i-fluent-trophy-24-regular"
            :title="t('page.seasons.archive.winner.empty')"
          />
        </SCard>
      </SRail>
    </section>

    <section aria-labelledby="season-format-title">
      <SRail>
        <template #caption>
          <h2 id="season-format-title">{{ t("page.seasons.archive.format.title") }}</h2>
        </template>
        <SCard v-if="season.format.summary || season.format.phases.length" class="h-row-grid">
          <div class="flex flex-col gap-4 px-2 py-4 text-sm">
            <p v-if="season.format.summary" class="whitespace-pre-line text-pretty">
              {{ season.format.summary }}
            </p>
            <ol v-if="season.format.phases.length" class="flex flex-col gap-3">
              <li v-for="(phase, index) in season.format.phases" :key="index" class="flex gap-3">
                <span class="w-5 shrink-0 text-muted tabular-nums">{{ index + 1 }}</span>
                <div class="flex min-w-0 flex-col gap-0.5">
                  <span class="font-medium text-highlighted">{{ phase.name }}</span>
                  <span v-if="phase.description" class="text-muted text-pretty">
                    {{ phase.description }}
                  </span>
                </div>
              </li>
            </ol>
          </div>
        </SCard>
        <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
          <SEmptyState
            icon="i-fluent-text-bullet-list-24-regular"
            :title="t('page.seasons.archive.format.empty')"
          />
        </SCard>
      </SRail>
    </section>

    <section aria-labelledby="season-participants-title">
      <SRail>
        <template #caption>
          <h2 id="season-participants-title">
            {{ t("page.seasons.archive.participants.title") }}
          </h2>
        </template>
        <SCard v-if="season.participants.length">
          <ul>
            <li
              v-for="participant in season.participants"
              :key="participant.team.id"
              class="flex flex-col border-t border-separator first:border-t-0"
            >
              <SListItem :to="$localePath(teamPath(participant.team.slug))" class="min-w-0 gap-2">
                <TeamImg :team-name="participant.team.name" :logo="participant.team" size="xs" />
                <span class="truncate text-sm font-medium text-highlighted" translate="no">
                  {{ participant.team.name }}
                </span>
                <span
                  v-if="participant.team.id === season.winner?.id"
                  class="shrink-0 text-xs text-muted"
                >
                  {{ t("page.seasons.archive.participants.winner") }}
                </span>
              </SListItem>
              <div class="flex flex-col gap-2 px-2 pb-4 text-sm">
                <p v-if="participant.pathNote" class="text-pretty">{{ participant.pathNote }}</p>
                <ol v-if="participant.path.length" class="flex flex-col gap-1">
                  <li
                    v-for="(entry, index) in participant.path"
                    :key="index"
                    class="flex min-w-0 flex-wrap items-baseline gap-x-2"
                  >
                    <SLink
                      v-if="entry.tournament"
                      :to="
                        $localePath(
                          tournamentStagePath(entry.tournament.event.slug, entry.tournament.slug),
                        )
                      "
                      variant="inline"
                    >
                      {{ entry.label }}
                    </SLink>
                    <span v-else>{{ entry.label }}</span>
                    <span class="text-muted">{{ entry.result }}</span>
                  </li>
                </ol>
                <p v-else-if="!participant.pathNote" class="text-muted">
                  {{ t("page.seasons.archive.participants.pathEmpty") }}
                </p>
              </div>
            </li>
          </ul>
        </SCard>
        <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
          <SEmptyState
            icon="i-fluent-people-team-24-regular"
            :title="t('page.seasons.archive.participants.empty')"
            :hint="t('page.seasons.archive.participants.emptyHint')"
          />
        </SCard>
      </SRail>
    </section>

    <section v-if="season.awards.length" aria-labelledby="season-awards-title">
      <SRail>
        <template #caption>
          <h2 id="season-awards-title">{{ t("page.seasons.archive.awards.title") }}</h2>
        </template>
        <SCard>
          <SListItem
            v-for="award in season.awards"
            :key="`${award.awardType}-${award.region ?? ''}`"
            :to="award.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="min-w-0"
          >
            <div class="flex w-full min-w-0 items-center gap-2">
              <UIcon
                name="i-fluent-star-24-filled"
                class="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ awardTitle(award) }} ·
                  <span translate="no">{{ award.player.name }}</span>
                </p>
                <p class="truncate text-xs text-muted">{{ awardMeta(award) }}</p>
              </div>
              <UIcon
                name="i-fluent-open-24-regular"
                class="size-4 shrink-0 text-muted"
                aria-hidden="true"
              />
            </div>
          </SListItem>
        </SCard>
      </SRail>
    </section>
  </div>
</template>
