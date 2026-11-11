<script lang="ts" setup>
import type { Viewership, ViewershipScope } from "@sarpbc/types";
import { VIEWERSHIP_SCOPES } from "@sarpbc/types";
import {
  parseViewership,
  VIEWERSHIP_SOURCE_NAME_MAX_LENGTH,
  VIEWERSHIP_SOURCE_URL_MAX_LENGTH,
  type ViewershipError,
} from "@sarpbc/utils";

type ViewershipField = "peakViewers" | "averageViewers" | "measuredAt" | "sourceName" | "sourceUrl";

interface FieldFeedback {
  error?: string;
}

interface ViewershipForm {
  peakViewers: string;
  averageViewers: string;
  scope: ViewershipScope;
  measuredAt: string;
  sourceName: string;
  sourceUrl: string;
}

const { path, title } = defineProps<{
  path: string;
  title: string;
}>();
const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const form = ref<ViewershipForm>(emptyForm());
const stored = ref(false);
const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);

const scopeOptions = computed(() =>
  VIEWERSHIP_SCOPES.map((scope) => ({
    value: scope,
    label: t(`page.tournaments.viewership.scopes.${scope}`),
  })),
);

function emptyForm(): ViewershipForm {
  return {
    peakViewers: "",
    averageViewers: "",
    scope: "official",
    measuredAt: "",
    sourceName: "",
    sourceUrl: "",
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function toCount(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function toViewership(values: ViewershipForm): Viewership {
  return {
    peakViewers: toCount(values.peakViewers),
    averageViewers: values.averageViewers.trim() === "" ? null : toCount(values.averageViewers),
    scope: values.scope,
    measuredAt: values.measuredAt ? new Date(values.measuredAt).toISOString() : null,
    sourceName: values.sourceName,
    sourceUrl: values.sourceUrl,
  };
}

function fieldOf(error: ViewershipError): ViewershipField {
  switch (error) {
    case "invalid-peak":
      return "peakViewers";
    case "invalid-average":
    case "average-above-peak":
      return "averageViewers";
    case "missing-source-name":
    case "source-name-too-long":
      return "sourceName";
    case "invalid-source-url":
    case "source-url-not-https":
    case "forbidden-source":
      return "sourceUrl";
    case "invalid-measured-at":
      return "measuredAt";
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
}

const parsed = computed(() => parseViewership(toViewership(form.value)));

function feedback(field: ViewershipField): FieldFeedback {
  const result = parsed.value;
  if (result.ok || fieldOf(result.error) !== field) return {};
  return { error: t(`page.tournaments.viewership.errors.${result.error}`) };
}

function apply(viewership: Viewership | null) {
  stored.value = viewership !== null;
  form.value = viewership
    ? {
        peakViewers: String(viewership.peakViewers),
        averageViewers: viewership.averageViewers === null ? "" : String(viewership.averageViewers),
        scope: viewership.scope,
        measuredAt: toLocalInput(viewership.measuredAt),
        sourceName: viewership.sourceName,
        sourceUrl: viewership.sourceUrl,
      }
    : emptyForm();
}

async function load() {
  loading.value = true;
  loadFailed.value = false;
  try {
    apply((await getViewership(path)).viewership);
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen) void load();
  },
  { immediate: true },
);

async function save(viewership: Viewership | null, message: string) {
  saving.value = true;
  try {
    apply((await setViewership(path, viewership)).viewership);
    toast.add({ title: message, color: "success" });
    open.value = false;
  } catch (error) {
    reportError(error, t("page.tournaments.viewership.saveError"));
  } finally {
    saving.value = false;
  }
}

function submit() {
  const result = parsed.value;
  if (result.ok) void save(result.viewership, t("page.tournaments.viewership.saved"));
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="t('page.tournaments.viewership.description')"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <p v-if="loading" class="text-sm text-muted" aria-live="polite">
        {{ t("page.tournaments.viewership.loading") }}
      </p>

      <div v-else-if="loadFailed" class="flex flex-col items-start gap-2">
        <p class="text-sm text-error">{{ t("page.tournaments.viewership.loadError") }}</p>
        <UButton
          size="sm"
          variant="soft"
          :label="t('page.tournaments.viewership.retry')"
          @click="load"
        />
      </div>

      <form
        v-else
        id="viewership-form"
        class="grid grid-cols-1 gap-3 sm:grid-cols-2"
        @submit.prevent="submit"
      >
        <UFormField
          :label="t('page.tournaments.viewership.peakViewers')"
          required
          v-bind="feedback('peakViewers')"
        >
          <UInput
            v-model="form.peakViewers"
            inputmode="numeric"
            autocomplete="off"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('page.tournaments.viewership.averageViewers')"
          :hint="t('page.tournaments.viewership.optional')"
          v-bind="feedback('averageViewers')"
        >
          <UInput
            v-model="form.averageViewers"
            inputmode="numeric"
            autocomplete="off"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('page.tournaments.viewership.scope')">
          <USelect
            v-model="form.scope"
            :items="scopeOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('page.tournaments.viewership.measuredAt')"
          :hint="t('page.tournaments.viewership.optional')"
          v-bind="feedback('measuredAt')"
        >
          <UInput v-model="form.measuredAt" type="datetime-local" step="1" class="w-full" />
        </UFormField>

        <UFormField
          :label="t('page.tournaments.viewership.sourceName')"
          required
          v-bind="feedback('sourceName')"
        >
          <UInput
            v-model="form.sourceName"
            :maxlength="VIEWERSHIP_SOURCE_NAME_MAX_LENGTH"
            autocomplete="off"
            class="w-full"
            :placeholder="t('page.tournaments.viewership.sourceNamePlaceholder')"
          />
        </UFormField>

        <UFormField
          :label="t('page.tournaments.viewership.sourceUrl')"
          required
          v-bind="feedback('sourceUrl')"
        >
          <UInput
            v-model="form.sourceUrl"
            type="url"
            inputmode="url"
            :maxlength="VIEWERSHIP_SOURCE_URL_MAX_LENGTH"
            class="w-full"
            :placeholder="t('page.tournaments.viewership.sourceUrlPlaceholder')"
          />
        </UFormField>

        <p class="text-xs text-muted sm:col-span-2">
          {{ t("page.tournaments.viewership.sourceRules") }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-row flex-wrap justify-between gap-2">
        <UButton
          color="error"
          variant="soft"
          icon="i-fluent-delete-24-regular"
          :label="t('page.tournaments.viewership.clear')"
          :disabled="loading || loadFailed || !stored || saving"
          @click="save(null, t('page.tournaments.viewership.cleared'))"
        />
        <div class="flex flex-row gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('page.tournaments.viewership.cancel')"
            @click="open = false"
          />
          <UButton
            type="submit"
            form="viewership-form"
            :label="t('page.tournaments.viewership.save')"
            :loading="saving"
            :disabled="loading || loadFailed || !parsed.ok"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
