<script lang="ts" setup>
import type { SeasonDetail, SeasonFormatPhase, SeasonInput } from "@sarpbc/types";
import {
  MAX_SEASON_FORMAT_PHASES,
  SEASON_FORMAT_PHASE_DESCRIPTION_MAX_LENGTH,
  SEASON_FORMAT_PHASE_NAME_MAX_LENGTH,
  SEASON_FORMAT_SUMMARY_MAX_LENGTH,
  SEASON_NAME_MAX_LENGTH,
} from "@sarpbc/utils";

const NO_WINNER = "none";

const { season = null } = defineProps<{
  season?: SeasonDetail | null;
  submitLabel: string;
  loading: boolean;
}>();

const emit = defineEmits<{ submit: [input: SeasonInput] }>();

const { t } = useI18n();

const name = ref(season?.name ?? "");
const slug = ref(season?.slug ?? "");
const summary = ref(season?.format.summary ?? "");

const phases = ref<SeasonFormatPhase[]>(season?.format.phases.map((phase) => ({ ...phase })) ?? []);

const winner = ref(season?.winnerTeamId ?? NO_WINNER);

const winnerOptions = computed(() => [
  { value: NO_WINNER, label: t("page.seasons.form.noWinner") },
  ...(season?.participants ?? []).map(({ team }) => ({ value: team.id, label: team.name })),
]);

const isValid = computed(
  () => name.value.trim().length > 0 && phases.value.every((phase) => phase.name.trim()),
);

function addPhase() {
  phases.value.push({ name: "", description: null });
}

function removePhase(index: number) {
  phases.value.splice(index, 1);
}

function submit() {
  if (!isValid.value) return;

  const input: SeasonInput = {
    name: name.value.trim(),
    slug: slug.value.trim() || null,
    format: {
      summary: summary.value.trim() || null,
      phases: phases.value.map((phase) => ({
        name: phase.name.trim(),
        description: phase.description?.trim() || null,
      })),
    },
  };

  if (season) input.winnerTeamId = winner.value === NO_WINNER ? null : winner.value;
  emit("submit", input);
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <UFormField
      :label="$t('page.seasons.form.name')"
      :hint="$t('page.seasons.form.nameHint')"
      name="name"
      required
    >
      <UInput v-model="name" :maxlength="SEASON_NAME_MAX_LENGTH" class="w-full" />
    </UFormField>

    <UFormField
      :label="$t('page.seasons.form.slug')"
      :hint="$t('page.seasons.form.slugHint')"
      name="slug"
    >
      <UInput v-model="slug" autocomplete="off" spellcheck="false" class="w-full" />
    </UFormField>

    <UFormField
      :label="$t('page.seasons.form.formatSummary')"
      :hint="$t('page.seasons.form.formatSummaryHint')"
      name="formatSummary"
    >
      <UTextarea
        v-model="summary"
        :maxlength="SEASON_FORMAT_SUMMARY_MAX_LENGTH"
        :rows="3"
        class="w-full"
      />
    </UFormField>

    <fieldset class="flex flex-col gap-3">
      <legend class="mb-1 text-sm font-medium">{{ $t("page.seasons.form.phases") }}</legend>
      <p class="text-sm text-muted">{{ $t("page.seasons.form.phasesHint") }}</p>
      <ol v-if="phases.length" class="flex flex-col gap-3">
        <li
          v-for="(phase, index) in phases"
          :key="index"
          class="flex flex-col gap-2 border border-default p-3"
        >
          <div class="flex flex-row items-end gap-2">
            <UFormField
              :label="$t('page.seasons.form.phaseName', { number: index + 1 })"
              :name="`phase-${index}-name`"
              required
              class="flex-1"
            >
              <UInput
                v-model="phase.name"
                :maxlength="SEASON_FORMAT_PHASE_NAME_MAX_LENGTH"
                class="w-full"
              />
            </UFormField>
            <UButton
              type="button"
              color="error"
              variant="ghost"
              icon="i-fluent-delete-24-regular"
              :aria-label="$t('page.seasons.form.removePhase', { number: index + 1 })"
              @click="removePhase(index)"
            />
          </div>
          <UFormField
            :label="$t('page.seasons.form.phaseDescription')"
            :name="`phase-${index}-description`"
          >
            <UTextarea
              :model-value="phase.description ?? ''"
              :maxlength="SEASON_FORMAT_PHASE_DESCRIPTION_MAX_LENGTH"
              :rows="2"
              class="w-full"
              @update:model-value="phase.description = String($event)"
            />
          </UFormField>
        </li>
      </ol>
      <div>
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          icon="i-fluent-add-24-regular"
          :label="$t('page.seasons.form.addPhase')"
          :disabled="phases.length >= MAX_SEASON_FORMAT_PHASES"
          @click="addPhase"
        />
      </div>
    </fieldset>

    <UFormField
      v-if="season"
      :label="$t('page.seasons.form.winner')"
      :hint="$t('page.seasons.form.winnerHint')"
      name="winner"
    >
      <USelect
        v-model="winner"
        :items="winnerOptions"
        value-key="value"
        label-key="label"
        class="w-full"
      />
    </UFormField>

    <div>
      <UButton type="submit" :label="submitLabel" :loading="loading" :disabled="!isValid" />
    </div>
  </form>
</template>
