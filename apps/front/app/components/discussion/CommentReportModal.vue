<script lang="ts" setup>
import { REPLY_REPORT_REASONS, type ReplyReportReason } from "~/types/discussion";
import { reportComment } from "~/composables/discussion";

const open = defineModel<boolean>("open", { required: true });

const { commentId } = defineProps<{
  commentId: string;
}>();

const emit = defineEmits<{
  reported: [];
}>();

const { t } = useI18n();
const toast = useToast();

const selectedReason = ref<ReplyReportReason | null>(null);
const isSubmitting = ref(false);

const reasonItems = computed(() =>
  REPLY_REPORT_REASONS.map((reason) => ({
    label: t(`components.discussion.report.reasons.${reason}`),
    value: reason,
  })),
);

watch(open, (isOpen) => {
  if (!isOpen) {
    selectedReason.value = null;
  }
});

async function submitReport() {
  if (!selectedReason.value || isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;
  const result = await reportComment(commentId, selectedReason.value);
  isSubmitting.value = false;

  if (result.ok) {
    toast.add({
      title: t("components.discussion.report.messages.submitted"),
      color: "success",
    });
    open.value = false;
    emit("reported");
    return;
  }

  if (result.reason === "already_reported") {
    toast.add({
      title: t("components.discussion.report.messages.alreadyReported"),
      color: "warning",
    });
    open.value = false;
    return;
  }

  if (result.reason === "unauthorized") {
    toast.add({
      title: t("components.discussion.report.messages.signInRequired"),
      color: "warning",
    });
    return;
  }

  toast.add({
    title: t("components.discussion.messages.errorTitle"),
    description: result.message ?? t("components.discussion.report.messages.error"),
    color: "error",
  });
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('components.discussion.report.title')"
    :dismissible="!isSubmitting"
  >
    <template #body>
      <p class="text-sm text-muted mb-4">
        {{ $t("components.discussion.report.description") }}
      </p>
      <UFormField :label="$t('components.discussion.report.reasonLegend')" name="reason">
        <URadioGroup v-model="selectedReason" :items="reasonItems" />
      </UFormField>
    </template>
    <template #footer>
      <UButton
        color="primary"
        :label="$t('components.discussion.report.submit')"
        :loading="isSubmitting"
        :disabled="!selectedReason || isSubmitting"
        @click="submitReport"
      />
      <UButton
        color="neutral"
        variant="subtle"
        :label="$t('common.cancel')"
        :disabled="isSubmitting"
        @click="open = false"
      />
    </template>
  </UModal>
</template>
