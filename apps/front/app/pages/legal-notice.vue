<template>
  <div class="w-full flex flex-col">
    <h1
      class="flex text-xl font-semibold h-16 justify-center items-center md:justify-start md:items-start"
    >
      {{ t("pages.legalNotice.title") }}
    </h1>

    <div class="w-full flex flex-col gap-4">
      <div class="border border-default p-2 md:p-4">
        <p class="text-muted mb-6">
          {{ t("pages.legalNotice.lastUpdated") }}:
          {{ t("pages.legalNotice.lastUpdatedDate") }}
        </p>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.legalNotice.siteEditor.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.legalNotice.siteEditor.description") }}
          </p>
          <div class="text-muted space-y-2">
            <p>
              <strong>{{ t("pages.legalNotice.siteEditor.name") }}:</strong>
              Geoffroy Stanger
            </p>
            <p>
              <strong>{{ t("pages.legalNotice.siteEditor.address") }}:</strong>
              {{ t("pages.legalNotice.siteEditor.addressText") }}
            </p>
            <p>
              <strong>{{ t("pages.legalNotice.siteEditor.email") }}:</strong>
              contact@sarpbc.org
            </p>
          </div>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.legalNotice.publicationDirector.title") }}
          </h2>
          <div class="text-muted space-y-2">
            <p>
              <strong>{{ t("pages.legalNotice.publicationDirector.name") }}:</strong>
              Geoffroy Stanger
            </p>
            <p>
              <strong>{{ t("pages.legalNotice.publicationDirector.email") }}:</strong>
              contact@sarpbc.org
            </p>
          </div>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.legalNotice.hosting.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.legalNotice.hosting.description") }}
          </p>
          <div class="text-muted space-y-2">
            <p>
              <strong>{{ t("pages.legalNotice.hosting.companyName") }}:</strong>
              Hostinger International Ltd.
            </p>
            <p>
              <strong>{{ t("pages.legalNotice.hosting.address") }}:</strong>
              61 Lordou Vironos Street, 6023 Larnaca, Chypre
            </p>
          </div>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.legalNotice.intellectualProperty.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.legalNotice.intellectualProperty.description") }}
          </p>
          <p class="text-muted">
            {{ t("pages.legalNotice.intellectualProperty.rocketLeague") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.legalNotice.personalData.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.legalNotice.personalData.description") }}
          </p>
          <NuxtLink to="/privacy-policy" class="text-highlighted hover:text-primary font-medium">
            {{ t("pages.legalNotice.personalData.privacyPolicyLink") }}
          </NuxtLink>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.legalNotice.liability.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.legalNotice.liability.description") }}
          </p>
          <p class="text-muted">
            {{ t("pages.legalNotice.liability.accuracy") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.legalNotice.applicableLaw.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.legalNotice.applicableLaw.description") }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

useHead({
  title: computed(() => t("pages.legalNotice.title")),
  meta: [
    {
      name: "description",
      content: computed(() => t("pages.legalNotice.metaDescription")),
    },
  ],
});
</script>
