<script lang="ts" setup>
import { getApiErrorMessage } from "~/utils/apiError";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const tournamentId = computed(() => route.params.id as string);
const formState = ref(createEmptyTournamentFormState());
const slugAuto = ref(false);
const isSaving = ref(false);

const { data: tournament, status } = await useLazyAsyncData(
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

const [{ data: leagues }, { data: teamsData, status: teamsStatus }] = await Promise.all([
  useLazyAsyncData("admin-tournament-leagues", () => getTournamentLeagues(), {
    server: false,
    default: () => [],
  }),
  useLazyAsyncData("admin-tournament-teams", () => getAllTeams({ limit: 200 }), {
    server: false,
    default: () => ({ teams: [], total: 0 }),
  }),
]);

const teams = computed(() => teamsData.value?.teams ?? []);
const isManual = computed(() => tournament.value?.source === "manual");

async function handleSubmit() {
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
    const updated = await updateTournament(
      tournamentId.value,
      buildManualTournamentPayload(formState.value, "update"),
    );
    if (!updated) {
      toast.add({ title: t("page.tournaments.form.saveFailed"), color: "error" });
      return;
    }

    toast.add({ title: t("page.tournaments.edit.saved"), color: "success" });
    tournament.value = updated;
    formState.value = tournamentToFormState(updated);
  } catch (error) {
    console.error("Failed to update tournament:", error);
    toast.add({
      title: getApiErrorMessage(error) ?? t("page.tournaments.form.saveFailed"),
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
      <div class="flex flex-row gap-2">
        <UButton
          variant="soft"
          icon="i-fluent-trophy-24-regular"
          :label="$t('page.tournaments.viewMatches')"
          :to="localePath(`/tournaments/${tournamentId}`)"
        />
        <UButton
          v-if="isManual"
          type="button"
          icon="i-fluent-save-24-regular"
          :label="$t('page.tournaments.form.save')"
          :loading="isSaving"
          @click="handleSubmit"
        />
      </div>
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-6">
        <div v-if="status === 'pending'" class="text-sm text-muted">
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
                :label="
                  isManual
                    ? $t('page.tournaments.source.manual')
                    : $t('page.tournaments.source.pandascore')
                "
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
            :leagues="leagues ?? []"
            :teams="teams"
            :teams-pending="teamsStatus === 'pending'"
          />
        </template>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
