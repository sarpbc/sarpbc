<script lang="ts" setup>
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const formState = ref(eventToFormState(null));
const isSaving = ref(false);

const { data: leagues } = await useLazyAsyncData(
  "admin-tournament-leagues",
  () => getTournamentLeagues(),
  { server: false, default: () => [] },
);

const breadcrumbItems = computed(() => [
  { label: t("page.tournaments.title"), to: localePath("/tournaments") },
  { label: t("page.tournaments.events.title"), to: localePath("/tournaments/events") },
  { label: t("page.tournaments.events.create.title") },
]);

async function handleSubmit() {
  if (isSaving.value) return;
  if (!formState.value.name.trim()) {
    toast.add({ title: t("page.tournaments.events.form.nameRequired"), color: "error" });
    return;
  }
  isSaving.value = true;
  try {
    const created = await createEvent({
      ...buildEventPayload(formState.value, null),
      name: formState.value.name.trim(),
    });
    toast.add({ title: t("page.tournaments.events.create.saved"), color: "success" });
    await navigateTo(localePath(`/tournaments/events/${created.id}`));
  } catch (error) {
    console.error("Failed to create event:", error);
    toast.add({
      title: getApiErrorMessage(error) ?? t("page.tournaments.events.saveFailed"),
      color: "error",
    });
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <UButton
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
