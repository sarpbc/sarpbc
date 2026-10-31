<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { LocationQuery } from "vue-router";

type PlayerProfileTab = "info" | "matches" | "events" | "trophies";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();

const slug = computed(() => route.params.slug as string);

const { getPlayerFromSlug } = usePlayer();
const { getPlayerOldTeams } = usePlayerContract();

const { data: player, error: playerError } = await getPlayerFromSlug(slug);

if (!player.value) {
  throwEntityLoadError(playerError.value, {
    notFound: t("page.player.slug.playerNotFound"),
    failed: t("page.player.slug.failedToLoadPlayerData"),
  });
}

// A merged duplicate's slug resolves to the kept player.
if (player.value && player.value.slug !== slug.value) {
  await navigateTo(
    { path: localePath(`/player/${player.value.slug}`), query: route.query, hash: route.hash },
    { redirectCode: 301, replace: true },
  );
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

const {
  live: liveEvents,
  upcoming: upcomingEvents,
  past: pastEvents,
  pending: eventsPending,
  error: eventsError,
  refresh: refreshEvents,
} = usePlayerTournaments(playerId);

const df = computed(() => new DateFormatter(locale.value, { dateStyle: "medium" }));

const realName = computed(() =>
  [currentPlayer.value.firstName, currentPlayer.value.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" "),
);

const birthday = computed(() =>
  currentPlayer.value.birthday ? new Date(currentPlayer.value.birthday) : null,
);

function parsePlayerTab(value: LocationQuery[string] | number | undefined): PlayerProfileTab {
  if (value === "matches" || value === "events" || value === "trophies") {
    return value;
  }
  return "info";
}

const tab = computed<PlayerProfileTab>(() => parsePlayerTab(route.query.tab));

const tabItems = computed(() => [
  { value: "info" as const, label: t("page.player.slug.tabs.info") },
  { value: "matches" as const, label: t("page.player.slug.tabs.matches") },
  { value: "events" as const, label: t("page.player.slug.tabs.events") },
  { value: "trophies" as const, label: t("page.player.slug.tabs.trophies") },
]);

function setTab(nextTab: PlayerProfileTab) {
  const query: Record<string, string> = {};

  if (route.query.matches) {
    query.matches = String(route.query.matches);
  }
  if (route.query.events) {
    query.events = String(route.query.events);
  }

  if (nextTab === "info") {
    router.replace({ query: {} });
    return;
  }

  if (nextTab !== "matches") {
    delete query.matches;
  }
  if (nextTab !== "events") {
    delete query.events;
  }

  query.tab = nextTab;
  router.replace({ query });
}

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
    <div class="w-full flex min-w-0 flex-col">
      <SCard flush-top flush-bottom class="flex w-full min-w-0 flex-col">
        <!-- Snapped with its top border so the tab bar below lands on the rail row grid. -->
        <div
          class="flex h-row-grid w-full min-w-0 flex-col gap-3 border-t border-default p-3 sm:flex-row sm:gap-4 sm:p-4"
        >
          <PlayerImg
            class="mx-auto shrink-0 sm:mx-0"
            :player-name="currentPlayer.name"
            :img="currentPlayer.imageUrl"
            size="xl"
            priority
          />
          <div class="w-full min-w-0 flex flex-col gap-3 sm:justify-between">
            <div class="flex min-w-0 flex-col items-start gap-1">
              <h1 class="text-xl font-medium tracking-tight text-balance">
                {{ currentPlayer.name }}
              </h1>
              <div
                v-if="currentPlayer.nationality || realName"
                class="flex min-w-0 flex-row items-center gap-2"
              >
                <FlagIcon :nationality="currentPlayer.nationality" size="md" />
                <span v-if="realName" class="truncate text-sm text-muted">{{ realName }}</span>
              </div>
            </div>
            <dl class="w-full min-w-0 flex flex-col gap-3">
              <div
                v-if="birthday"
                class="flex min-w-0 flex-row items-center justify-between gap-3 sm:gap-4"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.age") }}</dt>
                <dd class="min-w-0">
                  <UTooltip
                    :content="{
                      align: 'center',
                      side: 'top',
                      sideOffset: 4,
                    }"
                    :text="df.format(birthday)"
                  >
                    <span class="text-sm font-medium tabular-nums">
                      {{ t("page.player.slug.xYears", { years: getAgeFromBirthday(birthday) }) }}
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
                    class="inline-flex items-center gap-2 min-w-0 text-sm font-medium"
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
              <div
                v-if="currentPlayer.role && currentPlayer.role !== 'active'"
                class="flex min-w-0 flex-row items-center justify-between gap-3 sm:gap-4"
              >
                <dt class="text-sm text-muted shrink-0">{{ t("page.player.slug.role") }}</dt>
                <dd class="min-w-0 text-sm font-medium">
                  {{ t(`common.contractRole.${currentPlayer.role}`) }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <UTabs
          :model-value="tab"
          :items="tabItems"
          :content="false"
          color="neutral"
          variant="link"
          class="w-full"
          :ui="{ list: 'h-row items-center border-t py-0 mb-0' }"
          @update:model-value="setTab(parsePlayerTab($event))"
        />
      </SCard>

      <template v-if="tab === 'info'">
        <PlayerFormerTeams v-if="oldTeams && oldTeams.length > 0" :contracts="oldTeams" />
        <PlayerFaqSection :player="currentPlayer" :trophies="trophies" />
      </template>

      <PlayerMatchesSection
        v-else-if="tab === 'matches'"
        :upcoming-matches="upcomingMatches"
        :past-matches="pastMatches"
        :live-matches="liveMatches"
        :pending="matchesPending"
        :has-error="Boolean(matchesError)"
        @retry="refreshMatches()"
      />

      <PlayerEventsSection
        v-else-if="tab === 'events'"
        :upcoming-events="upcomingEvents"
        :past-events="pastEvents"
        :live-events="liveEvents"
        :pending="eventsPending"
        :has-error="Boolean(eventsError)"
        @retry="refreshEvents()"
      />

      <template v-else>
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
      </template>
    </div>
  </SHubPageBody>
</template>
