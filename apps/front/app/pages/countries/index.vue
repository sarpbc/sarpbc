<script lang="ts" setup>
import { countryPath } from "@sarpbc/utils";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const countryName = useCountryName();

const {
  data: countries,
  pending,
  error,
  refresh,
} = await useAsyncData("countries-index", () => getCountries(), {
  default: () => [],
});

const namedCountries = computed(() =>
  countries.value
    .map((country) => ({ ...country, name: countryName(country.code) }))
    .toSorted((a, b) => a.name.localeCompare(b.name, locale.value)),
);

setPageSeo({
  description: t("page.countries.index.description"),
  title: t("page.countries.index.seoTitle"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubPageHeader>
      <template #title>{{ t("page.countries.index.title") }}</template>
      <template v-if="countries.length" #meta>
        <span>{{ t("page.countries.index.total", { count: countries.length }) }}</span>
      </template>
    </HubPageHeader>

    <div>
      <HubCard v-if="pending && !countries.length" aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <HubListItem v-for="index in 6" :key="index">
          <div class="flex w-full min-w-0 items-center gap-3">
            <SbSkeleton class="h-3 w-4" />
            <SbSkeleton class="h-3 w-40" />
          </div>
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SbErrorState :message="t('page.countries.index.error')" @retry="refresh()" />
      </HubCard>

      <HubCard v-else-if="namedCountries.length">
        <ul>
          <li v-for="country in namedCountries" :key="country.code">
            <HubListItem :to="$localePath(countryPath(country.code))" class="min-w-0 gap-3">
              <span class="flex w-4 shrink-0 justify-center">
                <FlagIcon :nationality="country.code" size="md" />
              </span>
              <span
                class="min-w-0 flex-1 truncate text-sm text-default group-hover:text-highlighted"
              >
                {{ country.name }}
              </span>
              <span class="shrink-0 text-xs text-muted tabular-nums">
                {{ t("page.hub.headers.playersTotal", { count: country.playerCount }) }}
              </span>
            </HubListItem>
          </li>
        </ul>
      </HubCard>

      <HubCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SbEmptyState
          icon="i-fluent-globe-24-regular"
          :title="t('page.countries.index.empty')"
          :hint="t('page.countries.index.emptyHint')"
        />
      </HubCard>
    </div>
  </div>
</template>
