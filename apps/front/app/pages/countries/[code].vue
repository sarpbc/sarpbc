<script lang="ts" setup>
import type { CountryDetail } from "@sarpbc/types";
import { countryPath, teamPath } from "@sarpbc/utils";

const route = useRoute();
const { t } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const countryName = useCountryName();

const code = computed(() => String(route.params.code));
const offset = computed(() => parseRouteOffset(route.query.offset));

const { data: country, error } = await useAsyncData<CountryDetail | null>(
  () => `country-${code.value}-${offset.value}`,
  () => getCountry(code.value, { limit: MATCH_LIST_PAGE_SIZE, offset: offset.value }),
  { watch: [code, offset], default: () => null },
);

if (!country.value) {
  throwEntityLoadError(error.value, {
    notFound: t("page.countries.detail.notFound"),
    failed: t("page.countries.detail.error"),
  });
}

const name = computed(() => (country.value ? countryName(country.value.code) : ""));
const currentPage = computed(() => Math.floor(offset.value / MATCH_LIST_PAGE_SIZE) + 1);

const totalPages = computed(() =>
  Math.max(1, Math.ceil((country.value?.matchTotal ?? 0) / MATCH_LIST_PAGE_SIZE)),
);

const hasNext = computed(
  () => offset.value + MATCH_LIST_PAGE_SIZE < (country.value?.matchTotal ?? 0),
);

watch(
  name,
  (current) => {
    setPageSeo({
      title: current
        ? t("page.countries.detail.seoTitle", { name: current })
        : t("page.countries.index.seoTitle"),
      description: current
        ? t("page.countries.detail.seoDescription", { name: current })
        : t("page.countries.index.description"),
    });
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="country" class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>
        <span class="inline-flex items-center gap-2">
          <FlagIcon :nationality="country.code" size="lg" />
          {{ name }}
        </span>
      </template>
      <template #meta>
        <SLink :to="$localePath('/countries')" variant="muted">
          {{ t("page.countries.detail.allCountries") }}
        </SLink>
      </template>
    </SHubPageHeader>

    <section aria-labelledby="country-players-title">
      <SRail>
        <template #caption>
          <h2 id="country-players-title">
            {{ t("page.countries.detail.players.title") }}
          </h2>
        </template>
        <SCard>
          <ul>
            <li v-for="player in country.players" :key="player.id">
              <PlayerLink :player="player" />
            </li>
          </ul>
        </SCard>
        <p class="px-2 pt-2 text-xs text-muted text-pretty">
          {{ t("page.countries.detail.players.rule") }}
        </p>
      </SRail>
    </section>

    <section aria-labelledby="country-teams-title">
      <SRail>
        <template #caption>
          <h2 id="country-teams-title">{{ t("page.countries.detail.teams.title") }}</h2>
        </template>
        <SCard v-if="country.teams.length">
          <ul>
            <li v-for="team in country.teams" :key="team.id">
              <SListItem :to="$localePath(teamPath(team.slug))" class="min-w-0 gap-3">
                <TeamImg :team-name="team.name" :logo="team" size="list" />
                <span
                  class="min-w-0 flex-1 truncate text-sm text-default group-hover:text-highlighted"
                  translate="no"
                >
                  {{ team.name }}
                </span>
              </SListItem>
            </li>
          </ul>
        </SCard>
        <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
          <SEmptyState
            icon="i-fluent-people-team-24-regular"
            :title="t('page.countries.detail.teams.empty')"
          />
        </SCard>
        <p class="px-2 pt-2 text-xs text-muted text-pretty">
          {{ t("page.countries.detail.teams.rule") }}
        </p>
      </SRail>
    </section>

    <section aria-labelledby="country-matches-title">
      <SRail>
        <template #caption>
          <h2 id="country-matches-title">{{ t("page.countries.detail.matches.title") }}</h2>
        </template>
        <template v-if="country.matches.length">
          <MatchListGroup :matches="country.matches" variant="result" />
          <SPagination
            v-if="country.matchTotal > MATCH_LIST_PAGE_SIZE"
            :current-page="currentPage"
            :total-pages="totalPages"
            :has-previous="offset > 0"
            :has-next="hasNext"
            :previous-to="{
              path: $localePath(countryPath(country.code)),
              query: offsetPageQuery(offset - MATCH_LIST_PAGE_SIZE),
            }"
            :next-to="{
              path: $localePath(countryPath(country.code)),
              query: offsetPageQuery(offset + MATCH_LIST_PAGE_SIZE),
            }"
            class="mt-row"
          />
        </template>
        <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
          <SEmptyState
            icon="i-fluent-trophy-24-regular"
            :title="t('page.countries.detail.matches.empty')"
          />
        </SCard>
        <p class="px-2 pt-2 text-xs text-muted text-pretty">
          {{ t("page.countries.detail.matches.rule") }}
        </p>
      </SRail>
    </section>
  </div>
</template>
