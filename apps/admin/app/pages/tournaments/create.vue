<script lang="ts" setup>
import { getApiErrorMessage } from "~/utils/apiError";

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();

const formState = ref(createEmptyTournamentFormState());
const slugAuto = ref(true);
const isSaving = ref(false);

const breadcrumbItems = computed(() => [
  {
    label: t("page.tournaments.title"),
    to: localePath("/tournaments"),
  },
  {
    label: t("page.tournaments.create.title"),
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
    const created = await createTournament(buildManualTournamentPayload(formState.value, "create"));
    if (!created) {
      toast.add({ title: t("page.tournaments.form.saveFailed"), color: "error" });
      return;
    }

    toast.add({ title: t("page.tournaments.create.saved"), color: "success" });
    await navigateTo(localePath(`/tournaments/${created.id}/edit`));
  } catch (error) {
    console.error("Failed to create tournament:", error);
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
      <UButton
        type="button"
        icon="i-fluent-save-24-regular"
        :label="$t('page.tournaments.form.save')"
        :loading="isSaving"
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

        <TournamentManualForm
          v-model="formState"
          v-model:slug-auto="slugAuto"
          :leagues="leagues ?? []"
          :teams="teams"
          :teams-pending="teamsStatus === 'pending'"
        />
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
