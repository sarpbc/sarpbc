<script lang="ts" setup>
import type { SeasonParticipant, SeasonPathEntry } from "@sarpbc/types";
import {
  SEASON_PATH_LABEL_MAX_LENGTH,
  SEASON_PATH_NOTE_MAX_LENGTH,
  SEASON_PATH_RESULT_MAX_LENGTH,
  tournamentStageLabel,
} from "@sarpbc/utils";
import type { PickedStage } from "~/components/circuit/StagePicker.vue";

const props = defineProps<{
  seasonId: string;
  participant: SeasonParticipant;
  isWinner: boolean;
}>();

const emit = defineEmits<{ changed: []; remove: [] }>();

const { t } = useI18n();
const localePath = useLocalePath();
const toast = useToast();
const reportError = useReportError();

const pathNote = ref(props.participant.pathNote ?? "");
const savingNote = ref(false);
const noteChanged = computed(() => pathNote.value.trim() !== (props.participant.pathNote ?? ""));

const label = ref("");
const result = ref("");
const stage = ref<PickedStage | null>(null);
const isPickerOpen = ref(false);
const addingEntry = ref(false);
const entryToRemove = ref<SeasonPathEntry | null>(null);

const canAddEntry = computed(() => label.value.trim().length > 0 && result.value.trim().length > 0);

function entryTournamentLabel(entry: SeasonPathEntry): string | null {
  return entry.tournament ? tournamentStageLabel(entry.tournament) : null;
}

async function saveNote() {
  savingNote.value = true;

  try {
    await updateSeasonPathNote(props.seasonId, props.participant.id, pathNote.value.trim() || null);
    toast.add({ title: t("page.seasons.path.noteSaved"), color: "success" });
    emit("changed");
  } catch (saveError) {
    reportError(saveError, t("page.seasons.path.noteFailed"));
  } finally {
    savingNote.value = false;
  }
}

function pickStage(picked: PickedStage) {
  stage.value = picked;

  if (!label.value.trim()) label.value = picked.label.slice(0, SEASON_PATH_LABEL_MAX_LENGTH);
}

async function addEntry() {
  if (!canAddEntry.value) return;
  addingEntry.value = true;

  try {
    await createSeasonPathEntry(props.seasonId, props.participant.id, {
      label: label.value.trim(),
      result: result.value.trim(),
      tournamentId: stage.value?.id ?? null,
    });
    label.value = "";
    result.value = "";
    stage.value = null;
    emit("changed");
  } catch (addError) {
    reportError(addError, t("page.seasons.path.addFailed"));
  } finally {
    addingEntry.value = false;
  }
}
</script>

<template>
  <article class="flex flex-col gap-4 border border-default p-3">
    <header class="flex flex-row flex-wrap items-center justify-between gap-2">
      <div class="flex min-w-0 flex-row items-center gap-2">
        <ULink
          :to="localePath(`/teams/${participant.team.id}`)"
          class="truncate font-medium"
          translate="no"
        >
          {{ participant.team.name }}
        </ULink>
        <UBadge v-if="isWinner" color="primary" variant="subtle" size="sm">
          {{ $t("page.seasons.participants.winner") }}
        </UBadge>
      </div>
      <UButton
        color="error"
        variant="ghost"
        size="sm"
        icon="i-fluent-delete-24-regular"
        :aria-label="$t('page.seasons.participants.remove.label', { name: participant.team.name })"
        @click="emit('remove')"
      />
    </header>

    <form class="flex max-w-xl flex-col gap-2" @submit.prevent="saveNote">
      <UFormField
        :label="$t('page.seasons.path.note')"
        :hint="$t('page.seasons.path.noteHint')"
        :name="`path-note-${participant.id}`"
      >
        <UTextarea
          v-model="pathNote"
          :maxlength="SEASON_PATH_NOTE_MAX_LENGTH"
          :rows="2"
          class="w-full"
        />
      </UFormField>
      <div>
        <UButton
          type="submit"
          size="sm"
          color="neutral"
          variant="outline"
          :label="$t('page.seasons.path.saveNote')"
          :loading="savingNote"
          :disabled="!noteChanged"
        />
      </div>
    </form>

    <div class="flex flex-col gap-2">
      <h3 class="text-sm font-medium">{{ $t("page.seasons.path.title") }}</h3>
      <p v-if="participant.path.length === 0" class="text-sm text-muted">
        {{ $t("page.seasons.path.empty") }}
      </p>
      <ol v-else class="flex flex-col gap-1">
        <li
          v-for="entry in participant.path"
          :key="entry.id"
          class="flex flex-row flex-wrap items-center justify-between gap-2 text-sm"
        >
          <div class="flex min-w-0 flex-col">
            <span>
              <span class="font-medium">{{ entry.label }}</span>
              · {{ entry.result }}
            </span>
            <span v-if="entry.tournament" class="flex flex-row items-center gap-2 text-muted">
              {{ entryTournamentLabel(entry) }}
              <UBadge
                v-if="entry.tournament.source === 'startgg'"
                color="warning"
                variant="subtle"
                size="sm"
              >
                {{ $t("page.seasons.path.startgg") }}
              </UBadge>
            </span>
          </div>
          <UButton
            color="error"
            variant="ghost"
            size="xs"
            icon="i-fluent-delete-24-regular"
            :aria-label="$t('page.seasons.path.remove.title')"
            @click="entryToRemove = entry"
          />
        </li>
      </ol>
    </div>

    <form class="flex max-w-xl flex-col gap-3" @submit.prevent="addEntry">
      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField
          :label="$t('page.seasons.path.label')"
          :name="`label-${participant.id}`"
          required
        >
          <UInput
            v-model="label"
            :maxlength="SEASON_PATH_LABEL_MAX_LENGTH"
            :placeholder="$t('page.seasons.path.labelPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="$t('page.seasons.path.result')"
          :name="`result-${participant.id}`"
          required
        >
          <UInput
            v-model="result"
            :maxlength="SEASON_PATH_RESULT_MAX_LENGTH"
            :placeholder="$t('page.seasons.path.resultPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>
      <div class="flex flex-row flex-wrap items-center gap-2 text-sm">
        <template v-if="stage">
          <span class="text-muted">{{
            $t("page.seasons.path.linked", { name: stage.label })
          }}</span>
          <UButton
            type="button"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-fluent-dismiss-24-regular"
            :aria-label="$t('page.seasons.path.unlink')"
            @click="stage = null"
          />
        </template>
        <UButton
          v-else
          type="button"
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-fluent-link-24-regular"
          :label="$t('page.seasons.path.link')"
          @click="isPickerOpen = true"
        />
      </div>
      <div>
        <UButton
          type="submit"
          size="sm"
          :label="$t('page.seasons.path.add')"
          :loading="addingEntry"
          :disabled="!canAddEntry"
        />
      </div>
    </form>

    <CircuitStagePicker
      v-model:open="isPickerOpen"
      :title="$t('page.seasons.path.picker.title')"
      :description="$t('page.seasons.path.picker.hint')"
      @select="pickStage"
    />

    <ConfirmDeleteModal
      v-model:target="entryToRemove"
      :title="$t('page.seasons.path.remove.title')"
      :confirm-label="$t('page.seasons.path.remove.confirmButton')"
      :message="(target) => $t('page.seasons.path.remove.confirm', { label: target.label })"
      :remove="(target) => deleteSeasonPathEntry(seasonId, participant.id, target.id)"
      @deleted="emit('changed')"
    />
  </article>
</template>
