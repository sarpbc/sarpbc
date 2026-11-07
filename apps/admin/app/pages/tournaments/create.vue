<script lang="ts" setup>
import { getApiErrorMessage } from "@sarpbc/utils";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const formState = ref(createEmptyTournamentFormState());
const slugAuto = ref(true);
const isSaving = ref(false);
const isUploading = ref(false);

const breadcrumbItems = computed(() => [
  {
    label: t("page.tournaments.title"),
    to: localePath("/tournaments"),
  },
  {
    label: t("page.tournaments.create.title"),
  },
]);

const [
  { data: leagues, error: leaguesError, refresh: refreshLeagues },
  { data: events, status: eventsStatus, error: eventsError, refresh: refreshEvents },
  { data: teams, status: teamsStatus, error: teamsError, refresh: refreshTeams },
] = await Promise.all([
  useLazyAsyncData("admin-tournament-leagues", () => getTournamentLeagues(), {
    server: false,
    default: () => [],
  }),
  useLazyAsyncData("admin-manual-events", () => getManualEvents(), {
    server: false,
    default: () => [],
  }),
  useLazyAsyncData("admin-tournament-teams", () => getEveryTeam(), {
    server: false,
    default: () => [],
  }),
]);

const optionsError = computed(() => leaguesError.value ?? eventsError.value ?? teamsError.value);

async function refreshOptions() {
  await Promise.all([refreshLeagues(), refreshEvents(), refreshTeams()]);
}

async function handleSubmit() {
  if (isSaving.value || isUploading.value) return;
  const validationError = validateManualTournamentForm(formState.value);
  if (validationError) {
    toast.add({
      title: t(`page.tournaments.form.errors.${validationError}`),
      color: "error",
    });
    return;
  }

  isSaving.value = true;
  try {
    const created = await createTournament(buildManualTournamentPayload(formState.value, null));
    toast.add({ title: t("page.tournaments.create.saved"), color: "success" });
    await navigateTo(localePath(`/tournaments/${created.id}/edit`));
  } catch (error) {
    reportError(error, t("page.tournaments.form.saveFailed"));
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
        type="button"
        icon="i-fluent-save-24-regular"
        :label="$t('page.tournaments.form.save')"
        :loading="isSaving"
        :disabled="isUploading"
        @click="handleSubmit"
      />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ $t("page.tournaments.create.title") }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{ $t("page.tournaments.create.subtitle") }}
          </p>
        </div>

        <LoadError
          v-if="optionsError"
          :message="getApiErrorMessage(optionsError) ?? $t('common.loadFailed')"
          @retry="refreshOptions()"
        />

        <TournamentManualForm
          v-else
          v-model="formState"
          v-model:slug-auto="slugAuto"
          :original="null"
          :events="events ?? []"
          :events-pending="eventsStatus === 'pending'"
          :leagues="leagues ?? []"
          :teams="teams"
          :teams-pending="teamsStatus === 'pending'"
          :image-disabled="isSaving"
          @update:uploading="isUploading = $event"
        />
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
