<script lang="ts" setup>
import type { CircuitDetail, CircuitScaleTier } from "@sarpbc/types";
import {
  MAX_CIRCUIT_PLACEMENT,
  MAX_CIRCUIT_POINTS,
  MAX_CIRCUIT_SCALE_TIERS,
  getApiErrorMessage,
  isLiquipediaSourceHost,
} from "@sarpbc/utils";

export interface ScaleEditorTarget {
  tournamentId: string;
  label: string;
  scale: CircuitScaleTier[];
  sourceUrl: string;
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

const props = defineProps<{ circuitId: string }>();
const target = defineModel<ScaleEditorTarget | null>("target", { required: true });
const emit = defineEmits<{ saved: [circuit: CircuitDetail] }>();

const { t } = useI18n();

const rows = ref<TierRow[]>([]);
const sourceUrl = ref("");
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
    saveError.value = null;
  },
  { immediate: true },
);

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
  return isLiquipediaSourceHost(url.hostname)
    ? t("page.circuits.scale.errors.sourceBlocked")
    : undefined;
});

const canSave = computed(
  () =>
    rows.value.length > 0 &&
    tiers.value !== null &&
    !hasOverlap.value &&
    sourceUrl.value.trim() !== "" &&
    sourceUrlError.value === undefined,
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
  if (current === null || scale === null || !canSave.value) return;
  saving.value = true;
  saveError.value = null;
  try {
    const circuit = await setCircuitStageScale(props.circuitId, current.tournamentId, {
      scale: scale.toSorted((a, b) => a.from - b.from),
      sourceUrl: sourceUrl.value.trim(),
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
        <p v-if="saveError" class="text-sm text-error" role="alert">{{ saveError }}</p>

        <div>
          <UButton
            variant="soft"
            icon="i-fluent-add-24-regular"
            :label="$t('page.circuits.scale.addTier')"
            :disabled="rows.length >= MAX_CIRCUIT_SCALE_TIERS"
            @click="addRow"
          />
        </div>
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
