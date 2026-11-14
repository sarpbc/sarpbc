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
  if (isOpen) value.value = sourceUrl ?? "";
});

async function save() {
  saving.value = true;

  try {
    await setMatchSource(matchId, normalizeSourceUrl(value.value));
    toast.add({ title: t("page.tournaments.matchSource.saved"), color: "success" });
    open.value = false;
    emit("saved");
  } catch (error) {
    reportError(error, t("page.tournaments.matchSource.saveError"));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('page.tournaments.matchSource.title', { match: label })"
    :description="t('page.tournaments.matchSource.description')"
  >
    <template #body>
      <UFormField :label="t('common.sourceUrl')" :error="sourceUrlError(value)">
        <UInput v-model="value" type="url" autocomplete="off" class="w-full" />
      </UFormField>
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
          :label="t('page.tournaments.matchSource.save')"
          :loading="saving"
          :disabled="!!sourceUrlError(value)"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
