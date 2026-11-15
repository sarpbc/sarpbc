<script lang="ts" setup>
import * as z from "zod";
import type { ForumPostCreationStatus, ForumTopic } from "@sarpbc/types";
import { forumPostPath } from "@sarpbc/utils";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();

const localePath = useLocalePath();
const user = useUser();

if (!user.value) {
  navigateTo(localePath("/login"));
}

setPageSeo({
  description: t("page.forum.new.description"),
  noIndex: true,
  title: t("page.forum.new.title"),
});

const toast = useToast();
const isSubmitting = ref(false);

const schema = z.object({
  content: z
    .string()
    .min(1, t("page.forum.new.validation.contentMinLength"))
    .max(2048, t("page.forum.new.validation.contentMaxLength")),
  title: z
    .string()
    .min(1, t("page.forum.new.validation.titleMinLength"))
    .max(128, t("page.forum.new.validation.titleMaxLength")),
  topicId: z.uuid(),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  content: "",
  title: "",
  topicId: "",
});

const topics = ref<ForumTopic[]>([]);
const topicsLoadFailed = ref(false);
const creationStatus = ref<ForumPostCreationStatus | null>(null);
const creationStatusLoadState = ref<"loading" | "ready" | "error">("loading");

const canSubmit = computed(
  () =>
    creationStatusLoadState.value === "ready" &&
    creationStatus.value?.canCreate === true &&
    !isSubmitting.value,
);

const rateLimitMessage = computed(() => {
  if (creationStatusLoadState.value !== "ready" || !creationStatus.value) {
    return null;
  }

  if (creationStatus.value.canCreate) {
    return null;
  }

  if (!creationStatus.value.nextAvailableAt) {
    return null;
  }

  const nextAt = longDateTimeFormatter(locale.value).format(
    new Date(creationStatus.value.nextAvailableAt),
  );

  return t("page.forum.new.rateLimitWait", {
    hours: creationStatus.value.cooldownHours,
    time: nextAt,
  });
});

const loadTopics = async () => {
  try {
    topics.value = await getTopics();
  } catch {
    topicsLoadFailed.value = true;
  }
};

onMounted(async () => {
  const [, status] = await Promise.all([loadTopics(), getForumPostCreationStatus()]);

  if (!status) {
    creationStatusLoadState.value = "error";

    return;
  }

  creationStatus.value = status;
  creationStatusLoadState.value = "ready";
});

type CreateForumPostResult = Awaited<ReturnType<typeof createForumPost>>;

const createFailureDescription = (
  failure: Exclude<CreateForumPostResult, { ok: true }>,
): string => {
  if (failure.reason === "rate_limited") {
    return failure.message ?? t("page.forum.new.messages.rateLimitDescription");
  }

  if (failure.reason === "unauthorized") {
    return t("page.forum.new.messages.signInRequired");
  }

  return failure.message ?? t("page.forum.new.messages.errorDescription");
};

const { errors, markSubmitted } = useFormErrors(schema, state);

const topicItems = computed(() =>
  topics.value.map((topic) => ({ label: topic.title, value: topic.id })),
);

const onSubmit = async () => {
  if (!canSubmit.value) {
    return;
  }

  markSubmitted();

  const result = schema.safeParse(state);

  if (!result.success) {
    return;
  }

  isSubmitting.value = true;

  const createResult = await createForumPost({
    content: result.data.content,
    id: crypto.randomUUID(),
    title: result.data.title,
    topicId: result.data.topicId,
  });

  isSubmitting.value = false;

  if (createResult.ok) {
    await navigateTo(localePath(forumPostPath(createResult.post.publicId, createResult.post.slug)));

    return;
  }

  if (createResult.reason === "rate_limited") {
    const status = await getForumPostCreationStatus();

    if (status) {
      creationStatus.value = status;
      creationStatusLoadState.value = "ready";
    } else {
      creationStatusLoadState.value = "error";
    }
  }

  const description = createFailureDescription(createResult);

  toast.add({
    color: "danger",
    description,
    title: t("page.forum.new.messages.errorTitle"),
  });
};
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <HubCrossCard class="w-full h-row-header">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-medium tracking-tight text-highlighted">
          {{ $t("page.forum.new.pageTitle") }}
        </h1>
      </div>
    </HubCrossCard>
    <HubCard size="l" class="p-4">
      <p v-if="creationStatusLoadState === 'loading'" class="text-sm text-muted mb-4">
        {{ $t("page.forum.new.statusLoading") }}
      </p>
      <p v-else-if="creationStatusLoadState === 'error'" class="text-sm text-error mb-4">
        {{ $t("page.forum.new.statusLoadError") }}
      </p>
      <p v-else-if="rateLimitMessage" class="text-sm text-muted">
        {{ rateLimitMessage }}
      </p>
      <form v-else class="w-full space-y-4" novalidate @submit.prevent="onSubmit">
        <SFormField
          :label="$t('page.forum.new.form.title')"
          :error="errors.title"
          required
          class="w-full"
        >
          <SInput
            v-model="state.title"
            :placeholder="$t('page.forum.new.form.titlePlaceholder')"
            class="w-full"
            :disabled="!canSubmit"
          />
        </SFormField>

        <SFormField
          :label="$t('page.forum.new.form.topic')"
          :error="errors.topicId"
          required
          class="w-full"
        >
          <p v-if="topicsLoadFailed" role="alert" class="text-sm text-error">
            {{ $t("page.forum.new.topicsLoadError") }}
          </p>
          <SRadioGroup
            v-else
            v-model="state.topicId"
            :items="topicItems"
            variant="cards"
            orientation="horizontal"
            :disabled="!canSubmit"
            :aria-label="$t('page.forum.new.form.topic')"
          />
        </SFormField>

        <SFormField
          :label="$t('page.forum.new.form.content')"
          :error="errors.content"
          required
          class="w-full"
        >
          <STextarea
            v-model="state.content"
            :placeholder="$t('page.forum.new.form.contentPlaceholder')"
            class="w-full"
            autoresize
            :disabled="!canSubmit"
          />
        </SFormField>

        <SButton type="submit" :disabled="!canSubmit" :loading="isSubmitting">
          {{ $t("page.forum.new.form.submit") }}
        </SButton>
      </form>
    </HubCard>
  </div>
</template>
