<script lang="ts" setup>
import * as z from "zod";
import type { ReplyTargetType } from "@sarpbc/types";

const {
  targetType,
  targetId,
  replyToId = null,
  autofocus = false,
} = defineProps<{
  targetType: ReplyTargetType;
  targetId: string;
  replyToId?: string | null;
  autofocus?: boolean;
}>();

const emit = defineEmits<{
  commentCreated: [];
}>();

const { t } = useI18n();
const user = useUser();
const toast = useToast();
const isSubmitting = ref(false);
const posthog = usePostHog();

// WARNING: wait for the session to resolve so SSR guest HTML hydrates before auth upgrades it.
const sessionReady = computed(() => user.value !== undefined);
const isSignedIn = computed(() => !!user.value);

const schema = z.object({
  content: z
    .string()
    .min(1, t("components.discussion.validation.contentMinLength"))
    .max(2048, t("components.discussion.validation.contentMaxLength")),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  content: "",
});

const { errors, markSubmitted } = useFormErrors(schema, state);

const contentInputRef = useTemplateRef("contentInput");

const focusContentInput = () => {
  nextTick(() => {
    contentInputRef.value?.focus();
  });
};

onMounted(() => {
  if (autofocus) {
    focusContentInput();
  }
});

type CreateCommentResult = Awaited<ReturnType<typeof createComment>>;

const createFailureDescription = (failure: Exclude<CreateCommentResult, { ok: true }>) => {
  if (failure.reason === "unauthorized") {
    return t("components.discussion.messages.signInRequired");
  }

  if (failure.reason === "rate_limited") {
    return failure.message ?? t("components.discussion.messages.rateLimitDescription");
  }

  return failure.message ?? t("components.discussion.messages.errorDescription");
};

const submitComment = async () => {
  if (!user.value || isSubmitting.value) {
    return;
  }

  markSubmitted();

  const result = schema.safeParse({
    content: state.content?.trim() ?? "",
  });

  if (!result.success) {
    return;
  }

  isSubmitting.value = true;

  const createResult = await createComment({
    content: result.data.content,
    replyToId: replyToId ?? undefined,
    targetId,
    targetType,
  });

  isSubmitting.value = false;

  if (createResult.ok) {
    state.content = "";
    posthog?.capture("comment_posted", { target_id: targetId, target_type: targetType });
    emit("commentCreated");
    toast.add({
      color: "success",
      title: t("components.discussion.messages.created"),
    });

    return;
  }

  const description = createFailureDescription(createResult);

  toast.add({
    color: "danger",
    description,
    title: t("components.discussion.messages.errorTitle"),
  });
};

const onSubmit = async () => {
  await submitComment();
};

const onEnterKey = (event: KeyboardEvent) => {
  event.preventDefault();
  void submitComment();
};
</script>

<template>
  <div class="w-full">
    <ForumSignInPrompt v-if="sessionReady && !isSignedIn" action="reply" class="inline-flex py-2" />
    <form
      v-else-if="isSignedIn"
      class="w-full flex flex-col gap-2"
      novalidate
      @submit.prevent="onSubmit"
    >
      <SFormField
        :label="$t('components.discussion.inputTitle')"
        :error="errors.content"
        required
        class="w-full"
      >
        <STextarea
          ref="contentInput"
          v-model="state.content"
          :placeholder="$t('components.discussion.inputPlaceholder')"
          class="w-full text-base"
          autoresize
          :disabled="isSubmitting"
          @keydown.enter.exact="onEnterKey"
        />
      </SFormField>

      <SButton
        type="submit"
        class="w-fit self-end px-4"
        :loading="isSubmitting"
        :disabled="isSubmitting"
      >
        {{
          isSubmitting ? $t("components.discussion.submitting") : $t("components.discussion.submit")
        }}
      </SButton>
    </form>
  </div>
</template>
