<script lang="ts" setup>
import type { TournamentMatchListItem } from "@sarpbc/types";
import { participantName } from "@sarpbc/utils";

const { match, label } = defineProps<{
  match: TournamentMatchListItem;
  label: string;
}>();

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const forfeited = ref(match.forfeitedBy !== null);
const forfeitedBy = ref(match.forfeitedBy ?? undefined);
const saving = ref(false);

const sides = computed(() =>
  match.participants.map((participant) => ({
    label: participantName(participant),
    value: participant.id,
  })),
);

const canForfeit = computed(() => sides.value.length === 2);

watch(open, (isOpen) => {
  if (isOpen) {
    forfeited.value = match.forfeitedBy !== null;
    forfeitedBy.value = match.forfeitedBy ?? undefined;
  }
});

const save = async () => {
  saving.value = true;

  try {
    await setMatchForfeit(match.id, forfeited.value ? (forfeitedBy.value ?? null) : null);
    toast.add({ color: "success", title: t("page.tournaments.matchForfeit.saved") });
    open.value = false;
    emit("saved");
  } catch (error) {
    reportError(error, t("page.tournaments.matchForfeit.saveError"));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('page.tournaments.matchForfeit.title', { match: label })"
    :description="t('page.tournaments.matchForfeit.description')"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <p v-if="!canForfeit" class="text-sm text-muted">
          {{ t("page.tournaments.matchForfeit.needsTwoSides") }}
        </p>
        <USwitch
          v-model="forfeited"
          :disabled="!canForfeit"
          :label="t('page.tournaments.matchForfeit.forfeit')"
        />
        <UFormField v-if="forfeited" :label="t('page.tournaments.matchForfeit.side')">
          <USelect v-model="forfeitedBy" :items="sides" class="w-full" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-row justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('common.cancel')"
          @click="open = false"
        />
        <UButton
          :label="t('page.tournaments.matchForfeit.save')"
          :loading="saving"
          :disabled="forfeited && forfeitedBy === undefined"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
