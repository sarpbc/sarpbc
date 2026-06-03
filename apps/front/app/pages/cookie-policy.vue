<script setup lang="ts">
const { t } = useI18n();

useHead({
  title: computed(() => t("pages.cookiePolicy.title")),
  meta: [
    {
      name: "description",
      content: computed(() => t("pages.cookiePolicy.metaDescription")),
    },
  ],
});
</script>

<template>
  <div class="w-full flex flex-col">
    <h1
      class="flex text-xl font-semibold h-16 justify-center items-center md:justify-start md:items-start"
    >
      {{ t("pages.cookiePolicy.title") }}
    </h1>

    <div class="w-full flex flex-col gap-4">
      <div class="border border-default p-6">
        <p class="text-muted mb-6">
          {{ t("pages.cookiePolicy.lastUpdated") }}:
          {{ t("pages.cookiePolicy.lastUpdatedDate") }}
        </p>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.cookiePolicy.whatAreCookies.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.cookiePolicy.whatAreCookies.description") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.cookiePolicy.howWeUseCookies.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.cookiePolicy.howWeUseCookies.description") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.cookiePolicy.typesOfCookies.title") }}
          </h2>

          <div class="space-y-4">
            <div class="border border-default p-4">
              <h3 class="font-medium text-highlighted mb-2">
                {{ t("pages.cookiePolicy.typesOfCookies.essential.title") }}
              </h3>
              <p class="text-muted text-sm">
                {{ t("pages.cookiePolicy.typesOfCookies.essential.description") }}
              </p>
            </div>

            <div class="border border-default p-4">
              <h3 class="font-medium text-highlighted mb-2">
                {{ t("pages.cookiePolicy.typesOfCookies.analytics.title") }}
              </h3>
              <p class="text-muted text-sm mb-2">
                {{ t("pages.cookiePolicy.typesOfCookies.analytics.description") }}
              </p>
              <p class="text-muted text-xs">
                {{ t("pages.cookiePolicy.typesOfCookies.analytics.googleAnalytics") }}
              </p>
            </div>
          </div>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.cookiePolicy.managingCookies.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.cookiePolicy.managingCookies.description") }}
          </p>
          <ul class="list-disc list-inside text-muted text-sm space-y-1 mb-4">
            <li>
              {{ t("pages.cookiePolicy.managingCookies.options.browserSettings") }}
            </li>
            <li>
              {{ t("pages.cookiePolicy.managingCookies.options.cookiePopup") }}
            </li>
            <li>
              {{ t("pages.cookiePolicy.managingCookies.options.thirdPartyTools") }}
            </li>
          </ul>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.cookiePolicy.cookieRetention.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.cookiePolicy.cookieRetention.description") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.cookiePolicy.changes.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.cookiePolicy.changes.description") }}
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.cookiePolicy.contact.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.cookiePolicy.contact.description") }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
