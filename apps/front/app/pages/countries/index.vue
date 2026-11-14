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
  title: t("page.countries.index.seoTitle"),
  description: t("page.countries.index.description"),
});
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <SHubPageHeader>
      <template #title>{{ t("page.countries.index.title") }}</template>
      <template v-if="countries.length" #meta>
        <span>{{ t("page.countries.index.total", { count: countries.length }) }}</span>
      </template>
    </SHubPageHeader>

    <div>
      <SCard v-if="pending && !countries.length" aria-live="polite">
        <span class="sr-only">{{ t("common.loading") }}</span>
        <SListItem v-for="index in 6" :key="index">
          <div class="flex w-full min-w-0 items-center gap-3">
            <USkeleton class="h-3 w-4" />
            <USkeleton class="h-3 w-40" />
          </div>
        </SListItem>
      </SCard>

      <SCard v-else-if="error" class="flex min-h-row-stack h-row-grid items-center">
        <SErrorState :message="t('page.countries.index.error')" @retry="refresh()" />
      </SCard>

      <SCard v-else-if="namedCountries.length">
        <ul>
          <li v-for="country in namedCountries" :key="country.code">
            <SListItem :to="$localePath(countryPath(country.code))" class="min-w-0 gap-3">
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
            </SListItem>
          </li>
        </ul>
      </SCard>

      <SCard v-else class="flex min-h-row-stack h-row-grid items-center">
        <SEmptyState
          icon="i-fluent-globe-24-regular"
          :title="t('page.countries.index.empty')"
          :hint="t('page.countries.index.emptyHint')"
        />
      </SCard>
    </div>
  </div>
</template>
