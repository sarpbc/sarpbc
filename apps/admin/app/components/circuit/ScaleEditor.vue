<script lang="ts" setup>
import type {
  CircuitDetail,
  CircuitEventTeam,
  CircuitScaleTier,
  CircuitStageFinishInput,
} from "@sarpbc/types";
import {
  MAX_CIRCUIT_PLACEMENT,
  MAX_CIRCUIT_POINTS,
  MAX_CIRCUIT_SCALE_TIERS,
  MAX_CIRCUIT_STAGE_TEAMS,
  getApiErrorMessage,
  isForbiddenCircuitSourceHost,
  isWorldwideCircuitRegion,
} from "@sarpbc/utils";

export interface ScaleEditorTarget {
  tournamentId: string;
  label: string;
  scale: CircuitScaleTier[];
  sourceUrl: string;
  worldwide: boolean;
  regionTeamIds: string[];
  finishes: CircuitStageFinishInput[];
}

interface FinishRow {
  key: number;
  teamId: string | undefined;
  placement: number | null;
}

interface TierRow {
  key: number;
  from: number | null;
  to: number | null;
  points: number | null;
}

interface ValidTier {
  from: number;
  to: number;
  points: number;
}

const props = defineProps<{ circuitId: string; region: string | null }>();
const target = defineModel<ScaleEditorTarget | null>("target", { required: true });
const emit = defineEmits<{ saved: [circuit: CircuitDetail] }>();

const { t } = useI18n();

const rows = ref<TierRow[]>([]);
const sourceUrl = ref("");
const worldwide = ref(false);
const regionTeamIds = ref<string[]>([]);
const finishRows = ref<FinishRow[]>([]);
const eventTeams = ref<CircuitEventTeam[]>([]);
const teamsStatus = ref<"pending" | "success" | "error">("pending");
const saving = ref(false);
const saveError = ref<string | null>(null);
const shown = shallowRef<ScaleEditorTarget | null>(target.value);
let nextKey = 0;

const open = computed({
  get: () => target.value !== null,
  set: (value) => {
    if (!value) target.value = null;
  },
});

watch(
  target,
  (value) => {
    if (value === null) return;
    shown.value = value;
    rows.value = value.scale.map((tier) => ({ key: nextKey++, ...tier }));
    sourceUrl.value = value.sourceUrl;
    worldwide.value = value.worldwide;
    regionTeamIds.value = [...value.regionTeamIds];
    finishRows.value = value.finishes.map((finish) => ({ key: nextKey++, ...finish }));
    saveError.value = null;
    void loadTeams(value.tournamentId);
  },
  { immediate: true },
);

async function loadTeams(tournamentId: string) {
  teamsStatus.value = "pending";
  eventTeams.value = [];
  try {
    const teams = await getCircuitStageTeams(props.circuitId, tournamentId);
    if (target.value?.tournamentId !== tournamentId) return;
    eventTeams.value = teams;
    teamsStatus.value = "success";
  } catch {
    if (target.value?.tournamentId === tournamentId) teamsStatus.value = "error";
  }
}

const regional = computed(() => !isWorldwideCircuitRegion(props.region));

const teamOptions = computed(() =>
  eventTeams.value.map(({ team, placement }) => ({
    value: team.id,
    label:
      placement === null
        ? team.name
        : t("page.circuits.scale.teamPlacement", { name: team.name, placement }),
  })),
);

function toggleRegionTeam(teamId: string, selected: boolean) {
  regionTeamIds.value = selected
    ? [...regionTeamIds.value, teamId]
    : regionTeamIds.value.filter((id) => id !== teamId);
}

function toFinish(row: FinishRow): CircuitStageFinishInput | null {
  const { teamId, placement } = row;
  if (
    teamId === undefined ||
    placement === null ||
    !Number.isInteger(placement) ||
    placement < 1 ||
    placement > MAX_CIRCUIT_PLACEMENT
  ) {
    return null;
  }
  return { teamId, placement };
}

const finishes = computed<CircuitStageFinishInput[] | null>(() => {
  const valid = finishRows.value.flatMap((row) => toFinish(row) ?? []);
  return valid.length === finishRows.value.length ? valid : null;
});

const hasRepeatedFinish = computed(() => {
  const teamIds = (finishes.value ?? []).map(({ teamId }) => teamId);
  return new Set(teamIds).size !== teamIds.length;
});

function finishError(row: FinishRow): string | undefined {
  if (toFinish(row) !== null) return undefined;
  if (row.teamId === undefined || row.placement === null) {
    return t("page.circuits.scale.finishes.errors.incomplete");
  }
  return t("page.circuits.scale.finishes.errors.placement", {
    maxPlacement: MAX_CIRCUIT_PLACEMENT,
  });
}

function addFinish() {
  finishRows.value.push({ key: nextKey++, teamId: undefined, placement: null });
}

function removeFinish(key: number) {
  finishRows.value = finishRows.value.filter((row) => row.key !== key);
}

function toTier(row: TierRow): ValidTier | null {
  const { from, to, points } = row;
  if (
    from === null ||
    to === null ||
    points === null ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    !Number.isInteger(points) ||
    from < 1 ||
    to < from ||
    to > MAX_CIRCUIT_PLACEMENT ||
    points < 0 ||
    points > MAX_CIRCUIT_POINTS
  ) {
    return null;
  }
  return { from, to, points };
}

function rowError(row: TierRow): string | undefined {
  if (toTier(row) !== null) return undefined;
  if (row.from === null || row.to === null || row.points === null) {
    return t("page.circuits.scale.errors.incomplete");
  }
  if (row.to < row.from) return t("page.circuits.scale.errors.range");
  return t("page.circuits.scale.errors.numbers", {
    maxPlacement: MAX_CIRCUIT_PLACEMENT,
    maxPoints: MAX_CIRCUIT_POINTS,
  });
}

const tiers = computed<ValidTier[] | null>(() => {
  const valid = rows.value.flatMap((row) => toTier(row) ?? []);
  return valid.length === rows.value.length ? valid : null;
});

const hasOverlap = computed(() => {
  const sorted = (tiers.value ?? []).toSorted((a, b) => a.from - b.from);
  return sorted.some((tier, index) => index > 0 && tier.from <= (sorted[index - 1]?.to ?? 0));
});

const sourceUrlError = computed<string | undefined>(() => {
  const value = sourceUrl.value.trim();
  if (value === "") return undefined;
  const url = URL.parse(value);
  if (url === null || (url.protocol !== "https:" && url.protocol !== "http:")) {
    return t("page.circuits.scale.errors.sourceUrl");
  }
  return isForbiddenCircuitSourceHost(url.hostname)
    ? t("page.circuits.scale.errors.sourceBlocked")
    : undefined;
});

const canSave = computed(
  () =>
    rows.value.length > 0 &&
    tiers.value !== null &&
    !hasOverlap.value &&
    sourceUrl.value.trim() !== "" &&
    sourceUrlError.value === undefined &&
    finishes.value !== null &&
    !hasRepeatedFinish.value,
);

function addRow() {
  const last = tiers.value?.toSorted((a, b) => a.to - b.to).at(-1);
  rows.value.push({
    key: nextKey++,
    from: last ? last.to + 1 : null,
    to: null,
    points: null,
  });
}

function removeRow(key: number) {
  rows.value = rows.value.filter((row) => row.key !== key);
}

async function save() {
  const current = target.value;
  const scale = tiers.value;
  const finishList = finishes.value;
  if (current === null || scale === null || finishList === null || !canSave.value) return;
  saving.value = true;
  saveError.value = null;
  try {
    const circuit = await setCircuitStageScale(props.circuitId, current.tournamentId, {
      scale: scale.toSorted((a, b) => a.from - b.from),
      sourceUrl: sourceUrl.value.trim(),
      worldwide: worldwide.value,
      regionTeamIds: worldwide.value ? regionTeamIds.value : [],
      finishes: finishList.toSorted((a, b) => a.placement - b.placement),
    });
    target.value = null;
    emit("saved", circuit);
  } catch (error) {
    saveError.value = getApiErrorMessage(error) ?? t("page.circuits.scale.saveFailed");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('page.circuits.scale.title')"
    :description="shown?.label ?? ''"
    :dismissible="!saving"
  >
    <template #body>
      <form class="flex flex-col gap-4" @submit.prevent="save">
        <p class="text-sm text-muted">{{ $t("page.circuits.scale.hint") }}</p>

        <UFormField
          :label="$t('page.circuits.scale.sourceUrl')"
          :hint="$t('page.circuits.scale.sourceUrlHint')"
          :error="sourceUrlError"
          name="sourceUrl"
          required
        >
          <UInput
            v-model="sourceUrl"
            type="url"
            autocomplete="off"
            spellcheck="false"
            placeholder="https://"
            class="w-full"
          />
        </UFormField>

        <p v-if="rows.length === 0" class="text-sm text-muted">
          {{ $t("page.circuits.scale.empty") }}
        </p>

        <div
          v-for="row in rows"
          :key="row.key"
          class="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2 border border-default p-3"
        >
          <UFormField :label="$t('page.circuits.scale.from')" :error="rowError(row)">
            <UInputNumber
              v-model="row.from"
              :min="1"
              :max="MAX_CIRCUIT_PLACEMENT"
              :step="1"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('page.circuits.scale.to')">
            <UInputNumber
              v-model="row.to"
              :min="1"
              :max="MAX_CIRCUIT_PLACEMENT"
              :step="1"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="$t('page.circuits.scale.points')">
            <UInputNumber
              v-model="row.points"
              :min="0"
              :max="MAX_CIRCUIT_POINTS"
              :step="1"
              class="w-full"
            />
          </UFormField>
          <UButton
            class="mt-6"
            color="error"
            variant="ghost"
            icon="i-fluent-delete-24-regular"
            :aria-label="$t('page.circuits.scale.removeTier')"
            @click="removeRow(row.key)"
          />
        </div>

        <p v-if="hasOverlap" class="text-sm text-error">
          {{ $t("page.circuits.scale.errors.overlap") }}
        </p>

        <div>
          <UButton
            variant="soft"
            icon="i-fluent-add-24-regular"
            :label="$t('page.circuits.scale.addTier')"
            :disabled="rows.length >= MAX_CIRCUIT_SCALE_TIERS"
            @click="addRow"
          />
        </div>

        <p v-if="teamsStatus === 'pending'" class="text-sm text-muted">
          {{ $t("page.circuits.scale.teamsLoading") }}
        </p>
        <p v-else-if="teamsStatus === 'error'" class="text-sm text-error" role="alert">
          {{ $t("page.circuits.scale.teamsError") }}
        </p>

        <fieldset class="flex flex-col gap-3 border border-default p-3">
          <legend class="px-1 text-sm font-medium">
            {{ $t("page.circuits.scale.region.title") }}
          </legend>
          <USwitch
            v-model="worldwide"
            :label="$t('page.circuits.scale.region.worldwide')"
            :description="$t('page.circuits.scale.region.worldwideHint')"
          />
          <template v-if="worldwide">
            <p v-if="!regional" class="text-sm text-muted">
              {{ $t("page.circuits.scale.region.worldwideCircuit") }}
            </p>
            <template v-else>
              <p class="text-sm text-muted">
                {{ $t("page.circuits.scale.region.teamsHint", { region: region ?? "" }) }}
              </p>
              <p
                v-if="teamsStatus === 'success' && eventTeams.length === 0"
                class="text-sm text-muted"
              >
                {{ $t("page.circuits.scale.noTeams") }}
              </p>
              <div v-else class="grid gap-2 sm:grid-cols-2">
                <UCheckbox
                  v-for="option in teamOptions"
                  :key="option.value"
                  :model-value="regionTeamIds.includes(option.value)"
                  :label="option.label"
                  @update:model-value="toggleRegionTeam(option.value, Boolean($event))"
                />
              </div>
              <p v-if="regionTeamIds.length === 0" class="text-sm text-warning">
                {{ $t("page.circuits.scale.region.noneSelected") }}
              </p>
            </template>
          </template>
        </fieldset>

        <fieldset class="flex flex-col gap-3 border border-default p-3">
          <legend class="px-1 text-sm font-medium">
            {{ $t("page.circuits.scale.finishes.title") }}
          </legend>
          <p class="text-sm text-muted">{{ $t("page.circuits.scale.finishes.hint") }}</p>
          <div
            v-for="row in finishRows"
            :key="row.key"
            class="grid grid-cols-[2fr_1fr_auto] items-start gap-2"
          >
            <UFormField :label="$t('page.circuits.scale.finishes.team')" :error="finishError(row)">
              <USelect
                v-model="row.teamId"
                :items="teamOptions"
                value-key="value"
                label-key="label"
                :placeholder="$t('page.circuits.scale.finishes.selectTeam')"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="$t('page.circuits.scale.finishes.placement')">
              <UInputNumber
                v-model="row.placement"
                :min="1"
                :max="MAX_CIRCUIT_PLACEMENT"
                :step="1"
                class="w-full"
              />
            </UFormField>
            <UButton
              class="mt-6"
              color="error"
              variant="ghost"
              icon="i-fluent-delete-24-regular"
              :aria-label="$t('page.circuits.scale.finishes.remove')"
              @click="removeFinish(row.key)"
            />
          </div>
          <p v-if="hasRepeatedFinish" class="text-sm text-error">
            {{ $t("page.circuits.scale.finishes.errors.repeated") }}
          </p>
          <div>
            <UButton
              variant="soft"
              icon="i-fluent-add-24-regular"
              :label="$t('page.circuits.scale.finishes.add')"
              :disabled="finishRows.length >= MAX_CIRCUIT_STAGE_TEAMS || teamOptions.length === 0"
              @click="addFinish"
            />
          </div>
        </fieldset>

        <p v-if="saveError" class="text-sm text-error" role="alert">{{ saveError }}</p>
      </form>
    </template>
    <template #footer>
      <UButton
        :label="$t('page.circuits.scale.save')"
        :loading="saving"
        :disabled="!canSave"
        @click="save"
      />
      <UButton
        color="neutral"
        variant="subtle"
        :label="$t('common.cancel')"
        :disabled="saving"
        @click="open = false"
      />
    </template>
  </UModal>
</template>
