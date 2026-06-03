<template>
  <div class="w-full flex flex-col">
    <h1
      class="flex text-xl font-semibold h-16 justify-center items-center md:justify-start md:items-start"
    >
      {{ t("pages.privacyPolicy.title") }}
    </h1>

    <div class="w-full flex flex-col gap-4">
      <div class="border border-default p-2 md:p-4">
        <p class="text-muted mb-6">
          {{ t("pages.privacyPolicy.lastUpdated") }}:
          {{ t("pages.privacyPolicy.lastUpdatedDate") }}
        </p>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.introduction.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.privacyPolicy.introduction.description") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.dataController.title") }}
          </h2>
          <div class="text-muted space-y-2">
            <p>
              <strong>{{ t("pages.privacyPolicy.dataController.email") }}:</strong>
              contact@sarpbc.org
            </p>
          </div>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.dataCollected.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.privacyPolicy.dataCollected.description") }}
          </p>

          <div class="space-y-4">
            <div class="border border-default p-4">
              <h3 class="font-medium text-highlighted mb-2">
                {{ t("pages.privacyPolicy.dataCollected.account.title") }}
              </h3>
              <ul class="text-muted text-sm space-y-1 list-disc list-inside">
                <li>
                  {{ t("pages.privacyPolicy.dataCollected.account.email") }}
                </li>
                <li>
                  {{ t("pages.privacyPolicy.dataCollected.account.username") }}
                </li>
                <li>
                  {{ t("pages.privacyPolicy.dataCollected.account.profile") }}
                </li>
              </ul>
            </div>

            <div class="border border-default p-4">
              <h3 class="font-medium text-highlighted mb-2">
                {{ t("pages.privacyPolicy.dataCollected.technical.title") }}
              </h3>
              <ul class="text-muted text-sm space-y-1 list-disc list-inside">
                <li>
                  {{ t("pages.privacyPolicy.dataCollected.technical.ip") }}
                </li>
                <li>
                  {{ t("pages.privacyPolicy.dataCollected.technical.browser") }}
                </li>
                <li>
                  {{ t("pages.privacyPolicy.dataCollected.technical.usage") }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.purposes.title") }}
          </h2>
          <ul class="text-muted space-y-2 list-disc list-inside">
            <li>{{ t("pages.privacyPolicy.purposes.service") }}</li>
            <li>{{ t("pages.privacyPolicy.purposes.communication") }}</li>
            <li>{{ t("pages.privacyPolicy.purposes.improvement") }}</li>
            <li>{{ t("pages.privacyPolicy.purposes.legal") }}</li>
          </ul>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.legalBasis.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.privacyPolicy.legalBasis.description") }}
          </p>
          <ul class="text-muted space-y-1 list-disc list-inside">
            <li>{{ t("pages.privacyPolicy.legalBasis.consent") }}</li>
            <li>{{ t("pages.privacyPolicy.legalBasis.contract") }}</li>
            <li>{{ t("pages.privacyPolicy.legalBasis.interest") }}</li>
          </ul>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.dataSharing.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.privacyPolicy.dataSharing.description") }}
          </p>
          <ul class="text-muted space-y-1 list-disc list-inside">
            <li>{{ t("pages.privacyPolicy.dataSharing.analytics") }}</li>
            <li>{{ t("pages.privacyPolicy.dataSharing.hosting") }}</li>
            <li>{{ t("pages.privacyPolicy.dataSharing.legal") }}</li>
          </ul>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.rights.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.privacyPolicy.rights.description") }}
          </p>
          <ul class="text-muted space-y-1 list-disc list-inside">
            <li>{{ t("pages.privacyPolicy.rights.access") }}</li>
            <li>{{ t("pages.privacyPolicy.rights.rectification") }}</li>
            <li>{{ t("pages.privacyPolicy.rights.erasure") }}</li>
            <li>{{ t("pages.privacyPolicy.rights.portability") }}</li>
            <li>{{ t("pages.privacyPolicy.rights.objection") }}</li>
            <li>{{ t("pages.privacyPolicy.rights.complaint") }}</li>
          </ul>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.retention.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.privacyPolicy.retention.description") }}
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.privacyPolicy.contact.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.privacyPolicy.contact.description") }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

useHead({
  title: computed(() => t("pages.privacyPolicy.title")),
  meta: [
    {
      name: "description",
      content: computed(() => t("pages.privacyPolicy.metaDescription")),
    },
  ],
});
</script>
