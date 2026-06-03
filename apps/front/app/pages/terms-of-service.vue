<template>
  <div class="w-full flex flex-col">
    <h1
      class="flex text-xl font-semibold h-16 justify-center items-center md:justify-start md:items-start"
    >
      {{ t("pages.termsOfService.title") }}
    </h1>

    <div class="w-full flex flex-col gap-4">
      <div class="border border-default p-2 md:p-4">
        <p class="text-muted mb-6">
          {{ t("pages.termsOfService.lastUpdated") }}:
          {{ t("pages.termsOfService.lastUpdatedDate") }}
        </p>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.acceptance.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.termsOfService.acceptance.description") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.description.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.termsOfService.description.content") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.userAccounts.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.termsOfService.userAccounts.description") }}
          </p>
          <ul class="text-muted space-y-1 list-disc list-inside">
            <li>{{ t("pages.termsOfService.userAccounts.accurate") }}</li>
            <li>{{ t("pages.termsOfService.userAccounts.security") }}</li>
            <li>{{ t("pages.termsOfService.userAccounts.responsibility") }}</li>
          </ul>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.userContent.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.termsOfService.userContent.description") }}
          </p>
          <p class="text-muted mb-3">
            {{ t("pages.termsOfService.userContent.prohibited.title") }}
          </p>
          <ul class="text-muted space-y-1 list-disc list-inside">
            <li>
              {{ t("pages.termsOfService.userContent.prohibited.illegal") }}
            </li>
            <li>
              {{ t("pages.termsOfService.userContent.prohibited.harmful") }}
            </li>
            <li>{{ t("pages.termsOfService.userContent.prohibited.spam") }}</li>
            <li>
              {{ t("pages.termsOfService.userContent.prohibited.copyright") }}
            </li>
          </ul>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.intellectualProperty.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.termsOfService.intellectualProperty.description") }}
          </p>
          <p class="text-muted">
            {{ t("pages.termsOfService.intellectualProperty.userContent") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.disclaimer.title") }}
          </h2>
          <p class="text-muted mb-3">
            {{ t("pages.termsOfService.disclaimer.description") }}
          </p>
          <p class="text-muted">
            {{ t("pages.termsOfService.disclaimer.warranty") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.limitation.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.termsOfService.limitation.description") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.termination.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.termsOfService.termination.description") }}
          </p>
        </section>

        <section class="mb-6">
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.changes.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.termsOfService.changes.description") }}
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold mb-3">
            {{ t("pages.termsOfService.contact.title") }}
          </h2>
          <p class="text-muted">
            {{ t("pages.termsOfService.contact.description") }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

useHead({
  title: computed(() => t("pages.termsOfService.title")),
  meta: [
    {
      name: "description",
      content: computed(() => t("pages.termsOfService.metaDescription")),
    },
  ],
});
</script>
