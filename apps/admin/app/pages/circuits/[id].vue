<script lang="ts" setup>
import type { CircuitDetail, CircuitInput, CircuitStage } from "@sarpbc/types";
import { getApiErrorMessage, isWorldwideCircuitRegion, tournamentStageLabel } from "@sarpbc/utils";
import type { PickedStage } from "~/components/circuit/StagePicker.vue";
import type { ScaleEditorTarget } from "~/components/circuit/ScaleEditor.vue";

const route = useRoute();
const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const circuitId = computed(() => String(route.params.id));
const dateFormatter = useDateFormatter({ year: "numeric", month: "short", day: "numeric" });

const {
  data: circuit,
  status,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-circuit-${circuitId.value}`,
  () => getCircuit(circuitId.value),
  { server: false, watch: [circuitId] },
);

const breadcrumbItems = computed(() => [
  { label: t("page.circuits.title"), to: localePath("/circuits") },
  { label: circuit.value?.name ?? circuitId.value },
]);

const isSaving = ref(false);
const isPickerOpen = ref(false);
const scaleTarget = ref<ScaleEditorTarget | null>(null);
const stageToRemove = ref<CircuitStage | null>(null);

function setCircuit(value: CircuitDetail) {
  circuit.value = value;
}

async function save(input: CircuitInput) {
  isSaving.value = true;
  try {
    const summary = await updateCircuit(circuitId.value, input);
    if (circuit.value) setCircuit({ ...circuit.value, ...summary });
    toast.add({ title: t("page.circuits.edit.saved"), color: "success" });
  } catch (saveError) {
    reportError(saveError, t("page.circuits.edit.failed"));
  } finally {
    isSaving.value = false;
  }
}

function startStage(stage: PickedStage) {
  scaleTarget.value = {
    tournamentId: stage.id,
    label: stage.label,
    scale: [],
    sourceUrl: "",
    worldwide: false,
    regionTeamIds: [],
    finishes: [],
  };
}

function stageLabel(stage: CircuitStage): string {
  return tournamentStageLabel(stage.tournament);
}

function editStage(stage: CircuitStage) {
  scaleTarget.value = {
    tournamentId: stage.tournament.id,
    label: stageLabel(stage),
    scale: stage.scale,
    sourceUrl: stage.sourceUrl,
    worldwide: stage.worldwide,
    regionTeamIds: stage.regionTeams.map(({ id }) => id),
    finishes: stage.finishes.map(({ team, placement }) => ({ teamId: team.id, placement })),
  };
}

function regionSummary(stage: CircuitStage): string | null {
  if (!stage.worldwide) return null;
  if (isWorldwideCircuitRegion(circuit.value?.region)) {
    return t("page.circuits.stages.worldwide");
  }
  const count = stage.regionTeams.length;
  return t("page.circuits.stages.regionTeams", { count }, count);
}

function formatDates(stage: CircuitStage): string {
  const { beginAt, endAt } = stage.tournament;
  const begin = beginAt ? dateFormatter.value.format(new Date(beginAt)) : null;
  const end = endAt ? dateFormatter.value.format(new Date(endAt)) : null;
  return [begin, end].filter((date) => date !== null).join(" – ") || "—";
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <p v-if="status === 'pending' && !circuit" class="text-sm text-muted">
        {{ $t("page.circuits.loading") }}
      </p>

      <LoadError
        v-else-if="error || !circuit"
        :message="getApiErrorMessage(error) ?? $t('page.circuits.loadError')"
        @retry="refresh()"
      />

      <div v-else class="flex flex-col gap-6">
        <section class="flex max-w-xl flex-col gap-3">
          <h2 class="text-lg font-semibold">{{ $t("page.circuits.edit.title") }}</h2>
          <CircuitForm
            :key="circuit.id"
            :circuit="circuit"
            :submit-label="$t('page.circuits.edit.submit')"
            :loading="isSaving"
            @submit="save"
          />
        </section>

        <section class="flex flex-col gap-3 border border-default p-4">
          <div class="flex flex-row flex-wrap items-start justify-between gap-2">
            <div class="flex flex-col gap-1">
              <h2 class="text-lg font-semibold">{{ $t("page.circuits.stages.title") }}</h2>
              <p class="text-sm text-muted">{{ $t("page.circuits.stages.hint") }}</p>
            </div>
            <UButton
              icon="i-fluent-add-24-regular"
              :label="$t('page.circuits.stages.add')"
              @click="isPickerOpen = true"
            />
          </div>

          <p v-if="circuit.stages.length === 0" class="text-sm text-muted">
            {{ $t("page.circuits.stages.empty") }}
          </p>

          <ul v-else class="flex flex-col gap-2">
            <li
              v-for="stage in circuit.stages"
              :key="stage.tournament.id"
              class="flex flex-row flex-wrap items-start justify-between gap-3 border border-default p-3"
            >
              <div class="flex min-w-0 flex-col gap-1 text-sm">
                <ULink :to="localePath(`/tournaments/${stage.tournament.id}`)" class="font-medium">
                  {{ stageLabel(stage) }}
                </ULink>
                <span class="text-muted">
                  {{ formatDates(stage) }} ·
                  {{ $t(`page.tournaments.source.${stage.tournament.source}`) }} ·
                  {{
                    $t(
                      "page.circuits.stages.tiers",
                      { count: stage.scale.length },
                      stage.scale.length,
                    )
                  }}
                  <template v-if="regionSummary(stage)"> · {{ regionSummary(stage) }}</template>
                  <template v-if="stage.finishes.length">
                    ·
                    {{
                      $t(
                        "page.circuits.stages.finishes",
                        { count: stage.finishes.length },
                        stage.finishes.length,
                      )
                    }}
                  </template>
                </span>
                <span v-if="stage.tournament.source === 'startgg'" class="text-muted">
                  {{ $t("page.circuits.stages.startggNotice") }}
                </span>
                <ULink
                  :to="stage.sourceUrl"
                  external
                  target="_blank"
                  class="break-all text-primary hover:underline"
                >
                  {{ stage.sourceUrl }}
                </ULink>
              </div>
              <div class="flex flex-row items-center gap-1">
                <UButton
                  color="neutral"
                  variant="soft"
                  size="sm"
                  icon="i-fluent-edit-24-regular"
                  :label="$t('page.circuits.stages.edit')"
                  @click="editStage(stage)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  size="sm"
                  icon="i-fluent-delete-24-regular"
                  :aria-label="$t('page.circuits.stages.remove.title')"
                  @click="stageToRemove = stage"
                />
              </div>
            </li>
          </ul>
        </section>
      </div>
    </DashboardContent>

    <CircuitStagePicker v-model:open="isPickerOpen" @select="startStage" />

    <CircuitScaleEditor
      v-model:target="scaleTarget"
      :circuit-id="circuitId"
      :region="circuit?.region ?? null"
      @saved="setCircuit"
    />

    <ConfirmDeleteModal
      v-model:target="stageToRemove"
      :title="$t('page.circuits.stages.remove.title')"
      :confirm-label="$t('page.circuits.stages.remove.confirmButton')"
      :message="(target) => $t('page.circuits.stages.remove.confirm', { name: stageLabel(target) })"
      :remove="(target) => removeCircuitStage(circuitId, target.tournament.id)"
      @deleted="refresh()"
    />
  </NuxtLayout>
</template>
