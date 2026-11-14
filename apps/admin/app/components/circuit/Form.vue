<script lang="ts" setup>
import type { CircuitInput, CircuitSummary } from "@sarpbc/types";
import {
  CIRCUIT_DESCRIPTION_MAX_LENGTH,
  CIRCUIT_NAME_MAX_LENGTH,
  CIRCUIT_REGION_MAX_LENGTH,
  MAX_CIRCUIT_QUALIFICATION_SPOTS,
  MAX_CIRCUIT_SEASON,
  MIN_CIRCUIT_SEASON,
} from "@sarpbc/utils";

const { circuit = null } = defineProps<{
  circuit?: CircuitSummary | null;
  submitLabel: string;
  loading: boolean;
}>();

const emit = defineEmits<{ submit: [input: CircuitInput] }>();

const { sourceUrlError: checkSourceUrl } = useSourceUrl();

const name = ref(circuit?.name ?? "");
const slug = ref(circuit?.slug ?? "");
const season = ref<number | null>(circuit?.season ?? null);
const region = ref(circuit?.region ?? "");
const description = ref(circuit?.description ?? "");
const sourceUrl = ref(circuit?.sourceUrl ?? "");
const qualificationSpots = ref<number | null>(circuit?.qualificationSpots ?? null);

const inRange = (value: number | null, min: number, max: number): boolean =>
  value === null || (Number.isInteger(value) && value >= min && value <= max);

const sourceUrlError = computed(() => checkSourceUrl(sourceUrl.value));

const isValid = computed(
  () =>
    name.value.trim().length > 0 &&
    season.value !== null &&
    inRange(season.value, MIN_CIRCUIT_SEASON, MAX_CIRCUIT_SEASON) &&
    inRange(qualificationSpots.value, 1, MAX_CIRCUIT_QUALIFICATION_SPOTS) &&
    sourceUrl.value.trim() !== "" &&
    sourceUrlError.value === undefined,
);

const submit = () => {
  const seasonValue = season.value;

  if (!isValid.value || seasonValue === null) {
    return;
  }

  const input: CircuitInput = {
    name: name.value.trim(),
    season: seasonValue,
    region: region.value.trim() || null,
    description: description.value.trim() || null,
    sourceUrl: sourceUrl.value.trim(),
    qualificationSpots: qualificationSpots.value,
  };

  const trimmedSlug = slug.value.trim();

  if (trimmedSlug) {
    input.slug = trimmedSlug;
  }

  emit("submit", input);
};
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <UFormField :label="$t('page.circuits.form.name')" name="name" required>
      <UInput v-model="name" :maxlength="CIRCUIT_NAME_MAX_LENGTH" class="w-full" />
    </UFormField>
    <UFormField
      :label="$t('page.circuits.form.slug')"
      :hint="$t('page.circuits.form.slugHint')"
      name="slug"
    >
      <UInput v-model="slug" autocomplete="off" spellcheck="false" class="w-full" />
    </UFormField>
    <UFormField
      :label="$t('page.circuits.form.season')"
      :hint="$t('page.circuits.form.seasonHint')"
      name="season"
      required
    >
      <UInputNumber
        v-model="season"
        :min="MIN_CIRCUIT_SEASON"
        :max="MAX_CIRCUIT_SEASON"
        :step="1"
        :format-options="{ useGrouping: false }"
        class="w-full"
      />
    </UFormField>
    <UFormField
      :label="$t('page.circuits.form.region')"
      :hint="$t('page.circuits.form.regionHint')"
      name="region"
    >
      <UInput v-model="region" :maxlength="CIRCUIT_REGION_MAX_LENGTH" class="w-full" />
    </UFormField>
    <UFormField :label="$t('page.circuits.form.description')" name="description">
      <UTextarea
        v-model="description"
        :maxlength="CIRCUIT_DESCRIPTION_MAX_LENGTH"
        :rows="3"
        class="w-full"
      />
    </UFormField>
    <UFormField
      :label="$t('page.circuits.form.sourceUrl')"
      :hint="$t('page.circuits.form.sourceUrlHint')"
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
    <UFormField
      :label="$t('page.circuits.form.qualificationSpots')"
      :hint="$t('page.circuits.form.qualificationSpotsHint')"
      name="qualificationSpots"
    >
      <UInputNumber
        v-model="qualificationSpots"
        :min="1"
        :max="MAX_CIRCUIT_QUALIFICATION_SPOTS"
        :step="1"
        class="w-full"
      />
    </UFormField>
    <div>
      <UButton type="submit" :label="submitLabel" :loading="loading" :disabled="!isValid" />
    </div>
  </form>
</template>
