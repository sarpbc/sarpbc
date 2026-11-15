<script lang="ts" setup>
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
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

/** Wait until session is known so SSR guest HTML can hydrate before auth upgrades. */
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

const createFailureDescription = (failure: Exclude<CreateCommentResult, { ok: true }>): string => {
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
    color: "error",
    description,
    title: t("components.discussion.messages.errorTitle"),
  });
};

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  event.preventDefault();
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
    <UForm
      v-else-if="isSignedIn"
      :schema="schema"
      :state="state"
      class="w-full flex flex-col gap-2"
      @submit="onSubmit"
    >
      <SbFormField :label="$t('components.discussion.inputTitle')" required class="w-full">
        <SbTextarea
          ref="contentInput"
          v-model="state.content"
          :placeholder="$t('components.discussion.inputPlaceholder')"
          class="w-full text-base"
          autoresize
          :disabled="isSubmitting"
          @keydown.enter.exact="onEnterKey"
        />
      </SbFormField>

      <SbButton
        type="submit"
        class="w-fit self-end px-4"
        :loading="isSubmitting"
        :disabled="isSubmitting"
      >
        {{
          isSubmitting ? $t("components.discussion.submitting") : $t("components.discussion.submit")
        }}
      </SbButton>
    </UForm>
  </div>
</template>
