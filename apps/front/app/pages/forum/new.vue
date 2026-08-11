<script lang="ts" setup>
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { ForumPostCreationStatus, Topic } from "~/types/forum";

const { t, locale } = useI18n();
const { setPageSeo } = useSarpbcSeo();
const { attrs: cuelumeAttrs, pressClass, playCue } = useCuelume();

const localePath = useLocalePath();
const user = useUser();

if (!user.value) {
  navigateTo(localePath("/login"));
}

setPageSeo({
  title: t("page.forum.new.title"),
  description: t("page.forum.new.description"),
  noIndex: true,
});

const toast = useToast();
const isSubmitting = ref(false);

const schema = z.object({
  title: z
    .string()
    .min(1, t("page.forum.new.validation.titleMinLength"))
    .max(128, t("page.forum.new.validation.titleMaxLength")),
  topicId: z.uuid(),
  content: z
    .string()
    .min(1, t("page.forum.new.validation.contentMinLength"))
    .max(2048, t("page.forum.new.validation.contentMaxLength")),
});

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  title: "",
  topicId: "",
  content: "",
});

const topics = ref<Topic[]>([]);
const creationStatus = ref<ForumPostCreationStatus | null>(null);
const creationStatusLoadState = ref<"loading" | "ready" | "error">("loading");

const canSubmit = computed(
  () =>
    creationStatusLoadState.value === "ready" &&
    creationStatus.value?.canCreate === true &&
    !isSubmitting.value,
);

const rateLimitMessage = computed(() => {
  if (creationStatusLoadState.value !== "ready" || !creationStatus.value) return null;
  if (creationStatus.value.canCreate) return null;
  if (!creationStatus.value.nextAvailableAt) return null;

  const nextAt = df(locale.value).format(new Date(creationStatus.value.nextAvailableAt));
  return t("page.forum.new.rateLimitWait", {
    hours: creationStatus.value.cooldownHours,
    time: nextAt,
  });
});

onMounted(async () => {
  const [loadedTopics, status] = await Promise.all([getTopics(), getForumPostCreationStatus()]);
  topics.value = loadedTopics;

  if (!status) {
    creationStatusLoadState.value = "error";
    return;
  }

  creationStatus.value = status;
  creationStatusLoadState.value = "ready";
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  event.preventDefault();

  if (!canSubmit.value) {
    return;
  }

  const result = schema.safeParse(state);
  if (!result.success) {
    return;
  }

  isSubmitting.value = true;
  playCue("loading");

  const postId = crypto.randomUUID();
  const createResult = await createForumPost({
    id: postId,
    title: result.data.title,
    content: result.data.content,
    topicId: result.data.topicId,
  });

  isSubmitting.value = false;

  if (createResult.ok) {
    await navigateTo(localePath(`/forum/post/${postId}`));
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

  const description =
    createResult.reason === "rate_limited"
      ? (createResult.message ?? t("page.forum.new.messages.rateLimitDescription"))
      : createResult.reason === "unauthorized"
        ? t("page.forum.new.messages.signInRequired")
        : (createResult.message ?? t("page.forum.new.messages.errorDescription"));

  toast.add({
    title: t("page.forum.new.messages.errorTitle"),
    description,
    color: "error",
  });
}
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <UiCrossCard class="w-full h-row-header">
      <div class="w-full flex justify-center items-center">
        <h1 class="text-xl font-semibold text-highlighted">
          {{ $t("page.forum.new.pageTitle") }}
        </h1>
      </div>
    </UiCrossCard>
    <UiCard class="p-4">
      <p v-if="creationStatusLoadState === 'loading'" class="text-sm text-muted mb-4">
        {{ $t("page.forum.new.statusLoading") }}
      </p>
      <p v-else-if="creationStatusLoadState === 'error'" class="text-sm text-error mb-4">
        {{ $t("page.forum.new.statusLoadError") }}
      </p>
      <p v-else-if="rateLimitMessage" class="text-sm text-muted mb-4">
        {{ rateLimitMessage }}
      </p>
      <UForm :schema="schema" :state="state" class="w-full space-y-4" @submit="onSubmit">
        <UFormField
          :label="$t('page.forum.new.form.title')"
          name="title"
          :required="true"
          class="w-full"
        >
          <UInput
            v-model="state.title"
            variant="soft"
            :placeholder="$t('page.forum.new.form.titlePlaceholder')"
            class="w-full"
            :disabled="!canSubmit"
          />
        </UFormField>

        <UFormField
          :label="$t('page.forum.new.form.topic')"
          name="topicId"
          :required="true"
          class="w-full"
        >
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="topic in topics"
              :key="topic.id"
              variant="soft"
              size="lg"
              :color="state.topicId === topic.id ? 'primary' : 'neutral'"
              :class="canSubmit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
              @click="canSubmit && (state.topicId = topic.id)"
            >
              {{ topic.title }}
            </UBadge>
          </div>
        </UFormField>

        <UFormField
          :label="$t('page.forum.new.form.content')"
          name="content"
          :required="true"
          class="w-full"
        >
          <UTextarea
            v-model="state.content"
            variant="soft"
            :placeholder="$t('page.forum.new.form.contentPlaceholder')"
            class="w-full"
            autoresize
            :disabled="!canSubmit"
          />
        </UFormField>

        <UButton
          type="submit"
          variant="soft"
          class="cursor-pointer"
          :class="pressClass"
          :disabled="!canSubmit"
          :loading="isSubmitting"
          v-bind="cuelumeAttrs.pressRelease"
        >
          {{ $t("page.forum.new.form.submit") }}
        </UButton>
      </UForm>
    </UiCard>
  </div>
</template>
