<script lang="ts" setup>
const { matchId, label, sourceUrl } = defineProps<{
  matchId: string;
  label: string;
  sourceUrl: string | null;
}>();

const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();
const { normalizeSourceUrl, sourceUrlError } = useSourceUrl();

const value = ref(sourceUrl ?? "");
const saving = ref(false);

watch(open, (isOpen) => {
  if (isOpen) {
    value.value = sourceUrl ?? "";
  }
});

const save = async () => {
  saving.value = true;

  try {
    await setMatchSource(matchId, normalizeSourceUrl(value.value));
    toast.add({ color: "success", title: t("page.tournaments.matchSource.saved") });
    open.value = false;
    emit("saved");
  } catch (error) {
    reportError(error, t("page.tournaments.matchSource.saveError"));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <SbModal
    v-model:open="open"
    :title="t('page.tournaments.matchSource.title', { match: label })"
    :description="t('page.tournaments.matchSource.description')"
  >
    <template #body>
      <SbFormField :label="t('common.sourceUrl')" :error="sourceUrlError(value)">
        <SbInput v-model="value" type="url" autocomplete="off" class="w-full" />
      </SbFormField>
    </template>

    <template #footer>
      <div class="flex w-full flex-row justify-end gap-2">
        <SbButton variant="tertiary" :label="t('common.cancel')" @click="open = false" />
        <SbButton
          :label="t('page.tournaments.matchSource.save')"
          :loading="saving"
          :disabled="!!sourceUrlError(value)"
          @click="save"
        />
      </div>
    </template>
  </SbModal>
</template>
