<script lang="ts" setup>
import type { RouteLocationRaw } from "vue-router";

const { t } = useI18n();
const localePath = useLocalePath();

type FooterLink = {
  label: string;
  to: RouteLocationRaw;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

const columns = computed<FooterColumn[]>(() => [
  {
    title: t("components.footer.columns.explore"),
    links: [
      { label: t("general.matches"), to: localePath("/matches") },
      {
        label: t("general.results"),
        to: { path: localePath("/matches"), query: { tab: "past" } },
      },
      { label: t("general.tournaments"), to: localePath("/tournaments") },
      { label: t("page.game.airriddle.title"), to: localePath("/game/airriddle") },
      { label: t("page.game.pickems.title"), to: localePath("/game/pickems") },
      { label: t("general.teams"), to: localePath("/team") },
      { label: t("general.players"), to: localePath("/player") },
    ],
  },
  {
    title: t("components.footer.columns.community"),
    links: [
      { label: t("general.news"), to: localePath("/") },
      { label: t("general.forum"), to: localePath("/forum") },
    ],
  },
  {
    title: t("components.footer.columns.legal"),
    links: [
      { label: t("components.footer.about"), to: localePath("/about") },
      { label: t("components.footer.cookiePolicy"), to: localePath("/cookie-policy") },
      { label: t("components.footer.legalNotice"), to: localePath("/legal-notice") },
      { label: t("components.footer.privacyPolicy"), to: localePath("/privacy-policy") },
      { label: t("components.footer.termsOfService"), to: localePath("/terms-of-service") },
    ],
  },
]);
</script>

<template>
  <footer class="w-full border-t border-default py-12 md:py-16">
    <div
      class="w-full max-w-7xl px-8 mx-auto flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-16"
    >
      <div class="flex flex-col gap-4 max-w-sm">
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
            class="h-6!"
            aria-label="sarpbc.org X / Twitter account"
          >
            <UIcon name="i-ri-twitter-x-fill" class="h-6 w-6" />
          </ULink>
          <SettingsLanguageSelect />
          <SettingsThemeSelect />
        </div>
      </div>

      <div
        class="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-6 text-sm"
        role="navigation"
        :aria-label="$t('components.footer.navLabel')"
      >
        <div v-for="column in columns" :key="column.title" class="flex flex-col gap-3">
          <h2 class="text-xs font-medium text-highlighted tracking-wide">
            {{ column.title }}
          </h2>
          <ul class="flex flex-col gap-2.5">
            <li v-for="link in column.links" :key="link.label">
              <ULink :to="link.to" class="text-muted hover:text-highlighted transition-colors">
                {{ link.label }}
              </ULink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>
