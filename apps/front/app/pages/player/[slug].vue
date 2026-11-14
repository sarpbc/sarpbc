<script lang="ts" setup>
import {
  countryCode,
  countryPath,
  isStaffContractRole,
  playerPath,
  staffPath,
  teamPath,
} from "@sarpbc/utils";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const route = useRoute();
const localePath = useLocalePath();

const slug = computed(() => route.params.slug as string);

const { data: player, error: playerError } = await useAsyncData(
  () => `player-slug-${slug.value}`,
  () => getPlayerFromSlug(slug.value),
  { watch: [slug] },
);

if (!player.value) {
  throwEntityLoadError(playerError.value, {
    notFound: t("page.player.slug.playerNotFound"),
    failed: t("page.player.slug.failedToLoadPlayerData"),
  });
}

// A merged duplicate's slug resolves to the kept player.
if (player.value && player.value.slug !== slug.value) {
  await redirectToCanonical(route, localePath(playerPath(player.value.slug)));
}

const currentPlayer = computed(() => player.value!);
const playerId = computed(() => player.value?.id ?? "");

const { data: oldTeams } = await useAsyncData(
  () => `player-old-teams-${playerId.value}`,
  () => getPlayerOldTeams(playerId.value),
  { watch: [playerId], default: () => [] },
);

const hasStaffCareer = computed(
  () =>
    isStaffContractRole(currentPlayer.value.role) ||
    (oldTeams.value ?? []).some((contract) => isStaffContractRole(contract.role)),
);

const {
  trophies,
  pending: trophiesPending,
  error: trophiesError,
  refresh: refreshTrophies,
} = useEntityTrophies("player", playerId);

const {
  awards,
  seasonAwards,
  hasAwards,
  pending: awardsPending,
  error: awardsError,
  refresh: refreshAwards,
} = usePlayerAwards(playerId);

const showAwardsSection = computed(
  () => awardsPending.value || Boolean(awardsError.value) || hasAwards.value,
);

const {
  standIns,
  hasStandIns,
  pending: standInsPending,
  error: standInsError,
  refresh: refreshStandIns,
} = usePlayerStandIns(playerId);

const showStandInsSection = computed(
  () => standInsPending.value || Boolean(standInsError.value) || hasStandIns.value,
);

const {
  live: liveMatches,
  upcoming: upcomingMatches,
  past: pastMatches,
  pending: matchesPending,
  error: matchesError,
  refresh: refreshMatches,
} = useEntityMatches("player", playerId);

const {
  live: liveEvents,
  upcoming: upcomingEvents,
  past: pastEvents,
  pending: eventsPending,
  error: eventsError,
  refresh: refreshEvents,
} = useEntityTournaments("player", playerId);

const mediumDate = computed(() => mediumDateFormatter(locale.value));

const realName = computed(() =>
  [currentPlayer.value.firstName, currentPlayer.value.lastName]
    .flatMap((part) => part?.trim() || [])
    .join(" "),
);

const countryName = useCountryName();
const nationalityCode = computed(() => countryCode(currentPlayer.value.nationality));

const birthday = computed(() =>
  currentPlayer.value.birthday ? new Date(currentPlayer.value.birthday) : null,
);

const { tab, tabItems, setTab } = useEntityTabs("player");

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
  <SHubPageBody>
    <div class="w-full flex min-w-0 flex-col gap-8">
      <SCrossCard class="w-full min-w-0">
        <div class="grid w-full min-w-0 self-stretch sm:grid-cols-[15rem_minmax(0,1fr)]">
          <div class="flex aspect-square items-center justify-center overflow-hidden bg-muted">
            <NuxtImg
              v-if="currentPlayer.imageUrl"
              :src="currentPlayer.imageUrl"
              :alt="currentPlayer.name"
              width="480"
              height="480"
              sizes="100vw sm:240px"
              preload
              class="h-full w-full object-cover"
            />
            <PlayerImg v-else :player-name="currentPlayer.name" size="xl" />
          </div>
          <div class="flex min-w-0 flex-col gap-1 p-6 pb-2">
            <span class="text-xs text-muted">{{ t("page.player.slug.kicker") }}</span>
            <h1 class="mt-1 text-3xl font-medium tracking-tight text-highlighted text-balance">
              {{ currentPlayer.name }}
            </h1>
            <div
              v-if="currentPlayer.nationality || realName"
              class="flex min-w-0 flex-row items-center gap-2"
            >
              <SLink
                v-if="nationalityCode"
                :to="$localePath(countryPath(nationalityCode))"
                :aria-label="countryName(nationalityCode)"
                class="inline-flex"
              >
                <FlagIcon :nationality="nationalityCode" size="md" />
              </SLink>
              <FlagIcon v-else :nationality="currentPlayer.nationality" size="md" />
              <span v-if="realName" class="truncate text-sm text-muted">{{ realName }}</span>
            </div>
            <dl class="mt-auto flex w-full min-w-0 flex-col pt-6">
              <div
                v-if="birthday"
                class="flex h-row min-w-0 flex-row items-center justify-between gap-3 border-t border-separator"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.age") }}</dt>
                <dd class="min-w-0">
                  <UTooltip
                    :content="{
                      align: 'center',
                      side: 'top',
                      sideOffset: 4,
                    }"
                    :text="mediumDate.format(birthday)"
                  >
                    <span class="text-sm font-medium tabular-nums">
                      {{ t("page.player.slug.xYears", { years: getAgeFromBirthday(birthday) }) }}
                    </span>
                  </UTooltip>
                </dd>
              </div>
              <div
                class="flex h-row min-w-0 flex-row items-center justify-between gap-3 border-t border-separator"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.currentTeam") }}</dt>
                <dd class="min-w-0 flex justify-end">
                  <SLink
                    v-if="currentPlayer.team"
                    :to="$localePath(teamPath(currentPlayer.team.slug))"
                    variant="inline"
                    class="inline-flex items-center gap-2 min-w-0 text-sm font-medium"
                  >
                    <TeamImg
                      :team-name="currentPlayer.team.name"
                      :logo="currentPlayer.team"
                      size="xs"
                    />
                    <span class="truncate">{{ currentPlayer.team.name }}</span>
                  </SLink>
                  <span v-else class="text-sm text-muted">
                    {{ t("page.player.slug.freeAgent") }}
                  </span>
                </dd>
              </div>
              <div
                v-if="currentPlayer.role && currentPlayer.role !== 'active'"
                class="flex h-row min-w-0 flex-row items-center justify-between gap-3 border-t border-separator"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.role") }}</dt>
                <dd class="min-w-0 text-sm font-medium">
                  {{ t(`common.contractRole.${currentPlayer.role}`) }}
                </dd>
              </div>
              <div
                v-if="hasStaffCareer"
                class="flex h-row min-w-0 flex-row items-center justify-between gap-3 border-t border-separator"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.staffCareer") }}</dt>
                <dd class="min-w-0">
                  <SLink
                    :to="$localePath(staffPath(currentPlayer.slug))"
                    variant="inline"
                    class="text-sm font-medium"
                  >
                    {{ t("page.player.slug.viewStaffProfile") }}
                  </SLink>
                </dd>
              </div>
              <div
                class="flex h-row min-w-0 flex-row items-center justify-between gap-3 border-t border-separator"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.compare") }}</dt>
                <dd class="min-w-0">
                  <SLink
                    :to="$localePath({ path: '/player/compare', query: { a: currentPlayer.slug } })"
                    variant="inline"
                    class="text-sm font-medium"
                  >
                    {{ t("page.player.slug.compareCareers") }}
                  </SLink>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </SCrossCard>

      <div class="flex h-row items-center justify-center px-2">
        <STabs
          :model-value="tab"
          :items="tabItems"
          :ariaLabel="t('page.player.slug.tabsLabel')"
          @update:model-value="setTab"
        />
      </div>

      <template v-if="tab === 'info'">
        <EntityOverview kind="player" :past-matches="pastMatches" :trophies="trophies" />
        <PlayerFormerTeams v-if="oldTeams && oldTeams.length > 0" :contracts="oldTeams" />
        <PlayerFaqSection :player="currentPlayer" :trophies="trophies" />
      </template>

      <template v-else-if="tab === 'matches'">
        <EntityMatchesSection
          kind="player"
          :upcoming-matches="upcomingMatches"
          :past-matches="pastMatches"
          :live-matches="liveMatches"
          :pending="matchesPending"
          :has-error="Boolean(matchesError)"
          @retry="refreshMatches()"
        />

        <PlayerStandInsSection
          v-if="showStandInsSection"
          :stand-ins="standIns"
          :pending="standInsPending"
          :has-error="Boolean(standInsError)"
          @retry="refreshStandIns()"
        />
      </template>

      <EntityEventsSection
        kind="player"
        v-else-if="tab === 'events'"
        :upcoming-events="upcomingEvents"
        :past-events="pastEvents"
        :live-events="liveEvents"
        :pending="eventsPending"
        :has-error="Boolean(eventsError)"
        @retry="refreshEvents()"
      />

      <EarningsSection v-else-if="tab === 'earnings'" owner="player" :owner-id="playerId" />

      <template v-else>
        <EntityTrophyCabinet
          kind="player"
          :trophies="trophies"
          :pending="trophiesPending"
          :has-error="Boolean(trophiesError)"
          @retry="refreshTrophies()"
        />

        <PlayerAwardsSection
          v-if="showAwardsSection"
          :awards="awards"
          :season-awards="seasonAwards"
          :pending="awardsPending"
          :has-error="Boolean(awardsError)"
          @retry="refreshAwards()"
        />
      </template>
    </div>
  </SHubPageBody>
</template>
