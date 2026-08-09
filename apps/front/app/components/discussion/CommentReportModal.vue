<script lang="ts" setup>
import type { ReplyReportReason } from "~/types/discussion";
import { reportComment } from "~/composables/discussion";

const REASONS: ReplyReportReason[] = ["spam", "harassment", "hate_speech", "off_topic", "other"];

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
      <fieldset class="flex flex-col gap-2">
        <legend class="sr-only">{{ $t("components.discussion.report.reasonLegend") }}</legend>
        <label
          v-for="reason in REASONS"
          :key="reason"
          class="flex items-center gap-2 rounded-sm border border-default px-3 py-2 cursor-pointer hover:bg-elevated"
        >
          <input
            v-model="selectedReason"
            type="radio"
            name="report-reason"
            :value="reason"
            class="size-4"
          />
          <span class="text-sm">{{ $t(`components.discussion.report.reasons.${reason}`) }}</span>
        </label>
      </fieldset>
    </template>
    <template #footer>
      <UButton
        color="primary"
        :label="$t('components.discussion.report.submit')"
        :loading="isSubmitting"
        :disabled="!selectedReason || isSubmitting"
        class="cursor-pointer"
        @click="submitReport"
      />
      <UButton
        color="neutral"
        variant="subtle"
        :label="$t('common.cancel')"
        :disabled="isSubmitting"
        class="cursor-pointer"
        @click="open = false"
      />
    </template>
  </UModal>
</template>
