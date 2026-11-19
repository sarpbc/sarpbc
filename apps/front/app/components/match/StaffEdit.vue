<script setup lang="ts">
import type { SelectOption } from "@sarpbc/design";
import { getApiErrorMessage, participantName } from "@sarpbc/utils";
import type { EditableMatchStatus } from "~/composables/matches/api";
import type { Match } from "~/types/matches";
import { getMatchParticipantScore } from "~/utils/match-score";

const { match } = defineProps<{ match: Match }>();

const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();
const toast = useToast();
const staffMode = useStaffMode();

const editable = computed(
  () => match.source !== "pandascore" && staffMode.can("tournaments.manage"),
);

const open = ref(false);
const saving = ref(false);
const status = ref<EditableMatchStatus>("not_started");
const scores = ref<(number | null)[]>([]);

const sides = computed(() => (match.participants ?? []).slice(0, 2));
const scored = computed(() => sides.value.length === 2);

const statusItems = computed<SelectOption<EditableMatchStatus>[]>(() =>
  (["not_started", "running", "finished"] as const).map((value) => ({
    label: t(`page.match.detail.staffEdit.statuses.${value}`),
    value,
  })),
);

const toEditableStatus = (value: string | undefined) =>
  value === "running" || value === "finished" ? value : "not_started";

watch(open, (isOpen) => {
  if (!isOpen) {
    return;
  }

  status.value = toEditableStatus(match.status);
  scores.value = sides.value.map((side) => getMatchParticipantScore(match.results, side.id) ?? 0);
});

const sendsScores = computed(() => scored.value && status.value !== "not_started");

const drawnFinished = computed(
  () => sendsScores.value && status.value === "finished" && scores.value[0] === scores.value[1],
);

const submit = async () => {
  if (saving.value || drawnFinished.value) {
    return;
  }

  saving.value = true;

  try {
    await updateMatchResult(match.id, {
      results: sendsScores.value
        ? sides.value.map((side, index) => ({
            participantId: side.id,
            score: scores.value[index] ?? 0,
          }))
        : undefined,
      status: status.value,
    });

    emit("saved");
    toast.add({ color: "success", title: t("page.match.detail.staffEdit.saved") });
    open.value = false;
  } catch (error) {
    toast.add({
      color: "danger",
      description: getApiErrorMessage(error) ?? undefined,
      title: t("page.match.detail.staffEdit.saveError"),
    });
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <template v-if="editable">
    <SButton
      icon="i-fluent-edit-24-regular"
      variant="tertiary"
      size="sm"
      class="-my-1"
      :aria-label="t('page.match.detail.staffEdit.open')"
      @click="open = true"
    />

    <SModal
      v-model:open="open"
      :title="t('page.match.detail.staffEdit.title')"
      :dismissible="!saving"
    >
      <template #body>
        <form id="match-staff-edit-form" class="flex flex-col gap-4" @submit.prevent="submit">
          <SFormField :label="t('page.match.detail.staffEdit.status')">
            <SRadioGroup
              v-model="status"
              :items="statusItems"
              orientation="horizontal"
              :aria-label="t('page.match.detail.staffEdit.status')"
            />
          </SFormField>
          <div v-if="sendsScores" class="grid grid-cols-2 gap-4">
            <SFormField
              v-for="(side, index) in sides"
              :key="side.id"
              :label="t('page.match.detail.staffEdit.score', { team: participantName(side) })"
            >
              <SInputNumber v-model="scores[index]" :min="0" :step="1" class="w-full" />
            </SFormField>
          </div>
          <p v-if="drawnFinished" class="text-sm text-error" role="alert">
            {{ t("page.match.detail.staffEdit.drawnFinished") }}
          </p>
        </form>
      </template>
      <template #footer>
        <SButton
          type="submit"
          form="match-staff-edit-form"
          variant="primary"
          :loading="saving"
          :disabled="saving || drawnFinished"
          :label="
            saving ? t('page.match.detail.staffEdit.saving') : t('page.match.detail.staffEdit.save')
          "
        />
      </template>
    </SModal>
  </template>
</template>
