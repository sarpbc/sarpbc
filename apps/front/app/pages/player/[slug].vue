<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const route = useRoute();

const slug = computed(() => route.params.slug as string);

const { getPlayerFromSlug } = usePlayer();
const { getPlayerOldTeams } = usePlayerContract();

const { data: player } = await getPlayerFromSlug(slug);

if (!player.value) {
  throw createError({ statusCode: 404, message: "Player not found" });
}

const currentPlayer = computed(() => player.value!);
const playerId = computed(() => player.value?.id ?? "");

const { data: oldTeams } = await getPlayerOldTeams(playerId);

const {
  trophies,
  pending: trophiesPending,
  error: trophiesError,
  refresh: refreshTrophies,
} = usePlayerTrophies(playerId);

const {
  awards,
  hasAwards,
  pending: awardsPending,
  error: awardsError,
  refresh: refreshAwards,
} = usePlayerAwards(playerId);

const showAwardsSection = computed(
  () => awardsPending.value || Boolean(awardsError.value) || hasAwards.value,
);

const {
  live: liveMatches,
  upcoming: upcomingMatches,
  past: pastMatches,
  pending: matchesPending,
  error: matchesError,
  refresh: refreshMatches,
} = usePlayerMatches(playerId);

const df = computed(() => new DateFormatter(locale.value, { dateStyle: "medium" }));

const title = computed(() =>
  currentPlayer.value.name
    ? t("page.player.slug.seoTitleWithName", { name: currentPlayer.value.name })
    : t("page.player.slug.seoTitleDefault"),
);

const description = computed(() =>
  currentPlayer.value.name
    ? t("page.player.slug.seoDescriptionWithName", {
        name: currentPlayer.value.name,
      })
    : t("page.player.slug.seoDescriptionDefault"),
);

setPageSeo({
  title: title.value,
  description: description.value,
  image: currentPlayer.value.imageUrl || undefined,
});
</script>

<template>
  <div class="w-full max-w-5xl flex min-w-0 flex-col items-center gap-4 lg:gap-8">
    <section class="w-full min-w-0 flex flex-col gap-6">
      <div class="w-full min-w-0 flex flex-col gap-4">
        <div class="w-full min-w-0 flex flex-col items-start md:h-rail-caption">
          <h1 class="text-xl font-semibold tracking-tight text-balance">
            {{ currentPlayer.name }}
          </h1>
          <div class="flex min-w-0 flex-row items-center gap-2">
            <FlagIcon :nationality="currentPlayer.nationality" size="md" />
            <span class="truncate text-sm text-muted">
              {{ `${currentPlayer.firstName} ${currentPlayer.lastName}` }}
            </span>
          </div>
        </div>
        <div
          class="w-full min-w-0 flex flex-col border border-default gap-3 p-3 sm:flex-row sm:gap-4 sm:p-4"
        >
          <PlayerImg
            class="mx-auto sm:mx-0"
            :player-name="currentPlayer.name"
            :img="currentPlayer.imageUrl"
            size="xl"
            priority
          />
          <dl class="w-full min-w-0 flex flex-col gap-3">
            <div class="flex min-w-0 flex-row items-center justify-between gap-3 sm:gap-4">
              <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.age") }}</dt>
              <dd class="min-w-0">
                <UTooltip
                  v-if="currentPlayer.birthday !== undefined"
                  :content="{
                    align: 'center',
                    side: 'top',
                    sideOffset: 4,
                  }"
                  :text="df.format(new Date(currentPlayer.birthday))"
                >
                  <span class="text-sm font-medium tabular-nums">
                    {{
                      t("page.player.slug.xYears", {
                        years: getAgeFromBirthday(new Date(currentPlayer.birthday)),
                      })
                    }}
                  </span>
                </UTooltip>
              </dd>
            </div>
            <div class="flex min-w-0 flex-row items-center justify-between gap-3 sm:gap-4">
              <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.currentTeam") }}</dt>
              <dd class="min-w-0 flex justify-end">
                <SLink
                  v-if="currentPlayer.team"
                  :to="$localePath(`/team/${currentPlayer.team.slug}`)"
                  variant="inline"
                  class="inline-flex items-center gap-2 min-w-0"
                >
                  <TeamImg
                    :team-name="currentPlayer.team.name"
                    :image-url="currentPlayer.team.imageUrl"
                    :dark-mode-image-url="currentPlayer.team.darkModeImageUrl"
                    size="xs"
                  />
                  <span class="truncate">{{ currentPlayer.team.name }}</span>
                </SLink>
                <span v-else class="text-sm text-muted">
                  {{ t("page.player.slug.freeAgent") }}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <PlayerTrophyCabinet
        :trophies="trophies"
        :pending="trophiesPending"
        :has-error="Boolean(trophiesError)"
        @retry="refreshTrophies()"
      />

      <PlayerAwardsSection
        v-if="showAwardsSection"
        :awards="awards"
        :pending="awardsPending"
        :has-error="Boolean(awardsError)"
        @retry="refreshAwards()"
      />

      <PlayerMatchesSection
        :upcoming-matches="upcomingMatches"
        :past-matches="pastMatches"
        :live-matches="liveMatches"
        :pending="matchesPending"
        :has-error="Boolean(matchesError)"
        @retry="refreshMatches()"
      />

      <PlayerFormerTeams v-if="oldTeams && oldTeams.length > 0" :contracts="oldTeams" />
    </section>
  </div>
</template>
