<script lang="ts" setup>
import { REPLY_REPORT_REASONS } from "@sarpbc/types";
import type { ReplyReportReason } from "@sarpbc/types";
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

const selectedReason = ref<ReplyReportReason>();
const isSubmitting = ref(false);

const reasonItems = computed(() =>
  REPLY_REPORT_REASONS.map((reason) => ({
    label: t(`components.discussion.report.reasons.${reason}`),
    value: reason,
  })),
);

watch(open, (isOpen) => {
  if (!isOpen) {
    selectedReason.value = undefined;
  }
});

const submitReport = async () => {
  if (!selectedReason.value || isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;
  const result = await reportComment(commentId, selectedReason.value);
  isSubmitting.value = false;

  if (result.ok) {
    toast.add({
      color: "success",
      title: t("components.discussion.report.messages.submitted"),
    });
    open.value = false;
    emit("reported");

    return;
  }

  if (result.reason === "already_reported") {
    toast.add({
      color: "warning",
      title: t("components.discussion.report.messages.alreadyReported"),
    });
    open.value = false;

    return;
  }

  if (result.reason === "unauthorized") {
    toast.add({
      color: "warning",
      title: t("components.discussion.report.messages.signInRequired"),
    });

    return;
  }

  toast.add({
    color: "error",
    description: result.message ?? t("components.discussion.report.messages.error"),
    title: t("components.discussion.messages.errorTitle"),
  });
};
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
      <SbButton
        :label="$t('components.discussion.report.submit')"
        :loading="isSubmitting"
        :disabled="!selectedReason || isSubmitting"
        @click="submitReport"
      />
      <SbButton
        variant="secondary"
        :label="$t('common.cancel')"
        :disabled="isSubmitting"
        @click="open = false"
      />
    </template>
  </UModal>
</template>
