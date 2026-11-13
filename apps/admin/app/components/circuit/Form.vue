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

const props = defineProps<{
  circuit?: CircuitSummary;
  submitLabel: string;
  loading: boolean;
}>();

const emit = defineEmits<{ submit: [input: CircuitInput] }>();

const name = ref(props.circuit?.name ?? "");
const slug = ref(props.circuit?.slug ?? "");
const season = ref<number | null>(props.circuit?.season ?? null);
const region = ref(props.circuit?.region ?? "");
const description = ref(props.circuit?.description ?? "");
const sourceUrl = ref(props.circuit?.sourceUrl ?? "");
const qualificationSpots = ref<number | null>(props.circuit?.qualificationSpots ?? null);

function inRange(value: number | null, min: number, max: number): boolean {
  return value === null || (Number.isInteger(value) && value >= min && value <= max);
}

const isValid = computed(
  () =>
    name.value.trim().length > 0 &&
    inRange(season.value, MIN_CIRCUIT_SEASON, MAX_CIRCUIT_SEASON) &&
    inRange(qualificationSpots.value, 1, MAX_CIRCUIT_QUALIFICATION_SPOTS) &&
    (!sourceUrl.value.trim() || /^https?:\/\//.test(sourceUrl.value.trim())),
);

function submit() {
  if (!isValid.value) return;
  const input: CircuitInput = {
    name: name.value.trim(),
    season: season.value,
    region: region.value.trim() || null,
    description: description.value.trim() || null,
    sourceUrl: sourceUrl.value.trim() || null,
    qualificationSpots: qualificationSpots.value,
  };
  const trimmedSlug = slug.value.trim();
  if (trimmedSlug) input.slug = trimmedSlug;
  emit("submit", input);
}
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
      name="sourceUrl"
    >
      <UInput v-model="sourceUrl" type="url" autocomplete="off" class="w-full" />
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
