<script lang="ts" setup>
import type { RouteLocationRaw } from "vue-router";

const { t } = useI18n();
const localePath = useLocalePath();

const year = new Date().getFullYear();

type FooterLink = {
  label: string;
  to: RouteLocationRaw;
};

type FooterColumn = {
  title: string;
  links: FooterLink[];
};

type SocialLink = {
  label: string;
  icon: string;
  to: string;
};

const columns = computed<FooterColumn[]>(() => [
  {
    title: t("components.footer.columns.explore"),
    links: [
      { label: t("general.news"), to: localePath("/") },
      { label: t("general.matches"), to: localePath("/matches") },
      { label: t("general.results"), to: localePath("/results") },
      { label: t("general.tournaments"), to: localePath("/tournaments") },
      { label: t("general.teams"), to: localePath("/team") },
      { label: t("general.players"), to: localePath("/player") },
    ],
  },
  {
    title: t("components.footer.columns.community"),
    links: [
      { label: t("page.game.airriddle.title"), to: localePath("/game/airriddle") },
      { label: t("page.game.pickems.title"), to: localePath("/game/pickems") },
      { label: t("page.game.career.title"), to: localePath("/game/career") },
      { label: t("general.forum"), to: localePath("/forum") },
    ],
  },
  {
    title: t("components.footer.columns.company"),
    links: [
      { label: t("components.footer.about"), to: localePath("/about") },
      { label: t("components.footer.brand"), to: localePath("/brand") },
      { label: t("components.footer.contact"), to: localePath("/contact") },
      {
        label: t("components.footer.contribute"),
        to: "https://github.com/sarpbc/sarpbc/blob/main/CONTRIBUTING.md",
      },
    ],
  },
]);

const legalLinks = computed<FooterLink[]>(() => [
  { label: t("components.footer.cookiePolicy"), to: localePath("/cookie-policy") },
  { label: t("components.footer.legalNotice"), to: localePath("/legal-notice") },
  { label: t("components.footer.privacyPolicy"), to: localePath("/privacy-policy") },
  { label: t("components.footer.termsOfService"), to: localePath("/terms-of-service") },
]);

const socialLinks = computed<SocialLink[]>(() => [
  {
    label: t("components.footer.socialX"),
    icon: "i-ri-twitter-x-fill",
    to: "https://x.com/SARPBCorg",
  },
  {
    label: t("components.footer.socialGitHub"),
    icon: "i-ri-github-fill",
    to: "https://github.com/sarpbc/sarpbc",
  },
]);
</script>

<template>
  <footer class="w-full">
    <div class="mx-auto w-full max-w-7xl px-2 pt-8 pb-8 xl:px-0">
      <div class="grid grid-cols-2 gap-px border border-default bg-(--ui-border) md:grid-cols-4">
        <div class="col-span-2 flex flex-col gap-3 bg-default p-4 md:col-span-1">
          <ULink :to="localePath('/')" class="w-fit" :aria-label="$t('components.header.home')">
            <img src="/sarpbc.svg" alt="" width="48" height="48" class="size-12" />
          </ULink>
          <p class="max-w-64 text-xs text-muted">{{ $t("page.home.seo.description") }}</p>
          <ul class="flex items-center gap-3">
            <li v-for="social in socialLinks" :key="social.to">
              <ULink
                :to="social.to"
                :aria-label="social.label"
                class="flex text-muted transition-none hover:text-highlighted"
              >
                <UIcon :name="social.icon" class="size-4" aria-hidden="true" />
              </ULink>
            </li>
          </ul>
        </div>

        <nav class="contents" :aria-label="$t('components.footer.navLabel')">
          <div
            v-for="(column, index) in columns"
            :key="column.title"
            class="flex flex-col gap-3 bg-default p-4"
            :class="{ 'col-span-2 md:col-span-1': index === columns.length - 1 }"
          >
            <h2 class="text-xs font-medium text-toned">
              {{ column.title }}
            </h2>
            <ul class="flex flex-col items-start gap-2">
              <li v-for="link in column.links" :key="link.label">
                <SLink :to="link.to" variant="muted" class="text-xs">
                  {{ link.label }}
                </SLink>
              </li>
            </ul>
          </div>
        </nav>

        <div
          class="col-span-2 flex flex-wrap items-center justify-between gap-4 bg-default p-4 md:col-span-1"
        >
          <SettingsLanguageToggle class="-ml-1.5" />
          <SettingsThemeSelect />
        </div>

        <div
          class="col-span-2 flex flex-col gap-3 bg-default p-4 text-xs text-muted md:col-span-3 md:flex-row md:items-start md:justify-between"
        >
          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>{{ $t("components.footer.copyright", { year }) }}</span>
              <span>{{ $t("components.footer.dataSource") }}</span>
            </div>
            <p>{{ $t("components.footer.disclaimer") }}</p>
          </div>
          <ul class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <li v-for="link in legalLinks" :key="link.label">
              <SLink :to="link.to" variant="muted">
                {{ link.label }}
              </SLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>
