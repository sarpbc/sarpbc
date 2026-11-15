<script lang="ts" setup>
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const formState = ref(eventToFormState(null));
const isSaving = ref(false);

const { data: leagues } = await useLazyAsyncData(
  "admin-tournament-leagues",
  () => getTournamentLeagues(),
  { default: () => [], server: false },
);

const breadcrumbItems = computed(() => [
  { label: t("page.tournaments.title"), to: localePath("/tournaments") },
  { label: t("page.tournaments.events.title"), to: localePath("/tournaments/events") },
  { label: t("page.tournaments.events.create.title") },
]);

const handleSubmit = async () => {
  if (isSaving.value) {
    return;
  }

  if (!formState.value.name.trim()) {
    toast.add({ color: "danger", title: t("page.tournaments.events.form.nameRequired") });

    return;
  }

  isSaving.value = true;

  try {
    const created = await createEvent({
      ...buildEventPayload(formState.value, null),
      name: formState.value.name.trim(),
    });

    toast.add({ color: "success", title: t("page.tournaments.events.create.saved") });
    await navigateTo(localePath(`/tournaments/events/${created.id}`));
  } catch (error) {
    reportError(error, t("page.tournaments.events.saveFailed"));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <SbBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <SbButton
        icon="i-fluent-save-24-regular"
        :label="$t('page.tournaments.events.save')"
        :loading="isSaving"
        @click="handleSubmit"
      />
    </template>

    <DashboardContent>
      <form class="flex flex-col gap-6" @submit.prevent="handleSubmit">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ $t("page.tournaments.events.create.title") }}
          </h1>
          <p class="mt-1 text-sm text-muted">{{ $t("page.tournaments.events.create.subtitle") }}</p>
        </div>
        <TournamentEventForm v-model="formState" :leagues="leagues" :disabled="isSaving" />
      </form>
    </DashboardContent>
  </NuxtLayout>
</template>
