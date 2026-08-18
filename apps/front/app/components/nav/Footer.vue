<script lang="ts" setup>
import type { RouteLocationRaw } from "vue-router";

const { t } = useI18n();
const localePath = useLocalePath();

type FooterLink = {
  type: "link";
  label: string;
  to: RouteLocationRaw;
};

type FooterEntry = FooterLink;

type FooterColumn = {
  title: string;
  entries: FooterEntry[];
};

const columns = computed<FooterColumn[]>(() => [
  {
    title: t("components.footer.columns.explore"),
    entries: [
      { type: "link", label: t("general.matches"), to: localePath("/matches") },
      { type: "link", label: t("general.results"), to: localePath("/results") },
      { type: "link", label: t("general.tournaments"), to: localePath("/tournaments") },
      { type: "link", label: t("page.game.airriddle.title"), to: localePath("/game/airriddle") },
      { type: "link", label: t("page.game.pickems.title"), to: localePath("/game/pickems") },
      { type: "link", label: t("page.game.career.title"), to: localePath("/game/career") },
      { type: "link", label: t("general.teams"), to: localePath("/team") },
      { type: "link", label: t("general.players"), to: localePath("/player") },
    ],
  },
  {
    title: t("components.footer.columns.community"),
    entries: [
      { type: "link", label: t("general.news"), to: localePath("/") },
      { type: "link", label: t("general.forum"), to: localePath("/forum") },
    ],
  },
  {
    title: t("components.footer.columns.legal"),
    entries: [
      { type: "link", label: t("components.footer.about"), to: localePath("/about") },
      {
        type: "link",
        label: t("components.footer.cookiePolicy"),
        to: localePath("/cookie-policy"),
      },
      {
        type: "link",
        label: t("components.footer.legalNotice"),
        to: localePath("/legal-notice"),
      },
      {
        type: "link",
        label: t("components.footer.privacyPolicy"),
        to: localePath("/privacy-policy"),
      },
      {
        type: "link",
        label: t("components.footer.termsOfService"),
        to: localePath("/terms-of-service"),
      },
    ],
  },
]);
</script>

<template>
  <footer class="w-full border-t border-default py-12 md:py-16">
    <div
      class="w-full max-w-7xl px-8 mx-auto flex flex-col gap-10 lg:grid lg:grid-cols-4 lg:gap-12"
    >
      <div class="flex flex-col gap-4 max-w-sm lg:col-span-1">
        <span class="font-semibold text-dimmed">{{ new Date().getFullYear() }} sarpbc.org</span>

        <p class="text-muted text-xs leading-relaxed">
          {{ $t("components.footer.disclaimer") }}
        </p>

        <p class="text-muted text-xs">
          {{ $t("components.footer.dataSource") }}
        </p>

        <div class="flex flex-row items-center gap-3 pt-1">
          <ULink
            to="https://x.com/SARPBCorg"
            class="inline-flex items-center justify-center size-10 -ml-2"
            :aria-label="$t('components.footer.socialX')"
          >
            <UIcon name="i-ri-twitter-x-fill" class="size-6" />
          </ULink>
          <SettingsLanguageSelect />
          <SettingsThemeSelect />
        </div>
      </div>

      <nav
        class="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-6 text-sm lg:col-span-3"
        :aria-label="$t('components.footer.navLabel')"
      >
        <div v-for="column in columns" :key="column.title" class="flex flex-col gap-3">
          <h2 class="text-xs font-medium text-highlighted tracking-wide">
            {{ column.title }}
          </h2>
          <ul class="flex flex-col">
            <template v-for="entry in column.entries" :key="entry.label">
              <li>
                <SLink :to="entry.to" variant="muted" class="inline-flex items-center min-h-10">
                  {{ entry.label }}
                </SLink>
              </li>
            </template>
          </ul>
        </div>
      </nav>
    </div>
  </footer>
</template>
