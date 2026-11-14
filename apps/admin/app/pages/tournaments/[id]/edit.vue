<script lang="ts" setup>
import { getApiErrorMessage } from "@sarpbc/utils";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const tournamentId = computed(() => String(route.params.id));
const formState = ref(createEmptyTournamentFormState());
const slugAuto = ref(false);
const isSaving = ref(false);
const isUploading = ref(false);

const {
  data: tournament,
  status,
  error: tournamentError,
  refresh: refreshTournament,
} = await useLazyAsyncData(
  () => `admin-tournament-edit-${tournamentId.value}`,
  () => getTournamentById(tournamentId.value),
  { server: false, watch: [tournamentId] },
);

watch(
  tournament,
  (value) => {
    if (value) {
      formState.value = tournamentToFormState(value);
    }
  },
  { immediate: true },
);

const breadcrumbItems = computed(() => [
  {
    label: t("page.tournaments.title"),
    to: localePath("/tournaments"),
  },
  {
    label: tournament.value?.name ?? tournamentId.value,
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

const loadError = computed(
  () => tournamentError.value ?? leaguesError.value ?? eventsError.value ?? teamsError.value,
);

const reload = async () => {
  await Promise.all([refreshTournament(), refreshLeagues(), refreshEvents(), refreshTeams()]);
};

const isManual = computed(() => tournament.value?.source !== "pandascore");

const handleSubmit = async () => {
  if (!tournament.value || isSaving.value || isUploading.value) {
    return;
  }

  const validationError = isManual.value ? validateManualTournamentForm(formState.value) : null;

  if (validationError) {
    toast.add({
      title: t(`page.tournaments.form.errors.${validationError}`),
      color: "error",
    });

    return;
  }

  isSaving.value = true;

  try {
    const updated = await updateTournament(
      tournamentId.value,
      isManual.value
        ? buildManualTournamentPayload(formState.value, tournament.value)
        : { imageUrl: formState.value.imageUrl.trim() || null },
    );

    toast.add({ title: t("page.tournaments.edit.saved"), color: "success" });
    tournament.value = updated;
    formState.value = tournamentToFormState(updated);
  } catch (error) {
    reportError(error, t("page.tournaments.form.saveFailed"));
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>
    <template #action>
      <div class="flex flex-row gap-2">
        <UButton
          variant="soft"
          icon="i-fluent-trophy-24-regular"
          :label="$t('page.tournaments.viewMatches')"
          :to="localePath(`/tournaments/${tournamentId}`)"
        />
        <UButton
          v-if="tournament"
          type="button"
          icon="i-fluent-save-24-regular"
          :label="$t('page.tournaments.form.save')"
          :loading="isSaving"
          :disabled="isUploading"
          @click="handleSubmit"
        />
      </div>
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-6">
        <LoadError
          v-if="loadError"
          :message="getApiErrorMessage(loadError) ?? $t('common.loadFailed')"
          @retry="reload()"
        />

        <div v-else-if="status === 'pending'" class="text-sm text-muted">
          {{ $t("page.tournaments.loading") }}
        </div>

        <template v-else-if="tournament">
          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-semibold tracking-tight">
                {{ $t("page.tournaments.edit.title") }}
              </h1>
              <UBadge
                :color="isManual ? 'primary' : 'neutral'"
                variant="subtle"
                :label="$t(`page.tournaments.source.${tournament.source}`)"
              />
            </div>
            <p class="text-sm text-muted">
              {{
                isManual
                  ? $t("page.tournaments.edit.subtitleManual")
                  : $t("page.tournaments.edit.subtitlePandascore")
              }}
            </p>
          </div>

          <TournamentManualForm
            v-if="isManual"
            v-model="formState"
            v-model:slug-auto="slugAuto"
            :original="tournament"
            :events="events ?? []"
            :events-pending="eventsStatus === 'pending'"
            :leagues="leagues ?? []"
            :teams="teams"
            :teams-pending="teamsStatus === 'pending'"
            :image-disabled="isSaving"
            @update:uploading="isUploading = $event"
          />
          <TournamentImageField
            v-else
            v-model="formState.imageUrl"
            :disabled="isSaving"
            @update:uploading="isUploading = $event"
          />
        </template>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
