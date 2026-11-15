<script lang="ts" setup>
import type { Viewership, ViewershipScope } from "@sarpbc/types";
import { VIEWERSHIP_SCOPES } from "@sarpbc/types";
import {
  parseViewership,
  VIEWERSHIP_SOURCE_NAME_MAX_LENGTH,
  VIEWERSHIP_SOURCE_URL_MAX_LENGTH,
} from "@sarpbc/utils";
import type { ViewershipError } from "@sarpbc/utils";

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

const emptyForm = (): ViewershipForm => ({
  averageViewers: "",
  measuredAt: "",
  peakViewers: "",
  scope: "official",
  sourceName: "",
  sourceUrl: "",
});

const form = ref<ViewershipForm>(emptyForm());
const stored = ref(false);
const loading = ref(false);
const loadFailed = ref(false);
const saving = ref(false);

const scopeOptions = computed(() =>
  VIEWERSHIP_SCOPES.map((scope) => ({
    label: t(`page.tournaments.viewership.scopes.${scope}`),
    value: scope,
  })),
);

const pad = (value: number): string => String(value).padStart(2, "0");

const toLocalInput = (iso: string | null): string => {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const toCount = (value: string): number => (value.trim() === "" ? Number.NaN : Number(value));

const toViewership = (values: ViewershipForm): Viewership => ({
  averageViewers: values.averageViewers.trim() === "" ? null : toCount(values.averageViewers),
  measuredAt: values.measuredAt ? new Date(values.measuredAt).toISOString() : null,
  peakViewers: toCount(values.peakViewers),
  scope: values.scope,
  sourceName: values.sourceName,
  sourceUrl: values.sourceUrl,
});

const fieldOf = (error: ViewershipError): ViewershipField => {
  switch (error) {
    case "invalid-peak": {
      return "peakViewers";
    }

    case "invalid-average":
    case "average-above-peak": {
      return "averageViewers";
    }

    case "missing-source-name":
    case "source-name-too-long": {
      return "sourceName";
    }

    case "invalid-source-url":
    case "source-url-not-https":
    case "forbidden-source": {
      return "sourceUrl";
    }

    case "invalid-measured-at": {
      return "measuredAt";
    }

    default: {
      const exhaustive: never = error;

      return exhaustive;
    }
  }
};

const parsed = computed(() => parseViewership(toViewership(form.value)));

const feedback = (field: ViewershipField): FieldFeedback => {
  const result = parsed.value;

  if (result.ok || fieldOf(result.error) !== field) {
    return {};
  }

  return { error: t(`page.tournaments.viewership.errors.${result.error}`) };
};

const apply = (viewership: Viewership | null) => {
  stored.value = viewership !== null;
  form.value = viewership
    ? {
        averageViewers: viewership.averageViewers === null ? "" : String(viewership.averageViewers),
        measuredAt: toLocalInput(viewership.measuredAt),
        peakViewers: String(viewership.peakViewers),
        scope: viewership.scope,
        sourceName: viewership.sourceName,
        sourceUrl: viewership.sourceUrl,
      }
    : emptyForm();
};

const load = async () => {
  loading.value = true;
  loadFailed.value = false;

  try {
    const response = await getViewership(path);

    apply(response.viewership);
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
};

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      void load();
    }
  },
  { immediate: true },
);

const save = async (viewership: Viewership | null, message: string) => {
  saving.value = true;

  try {
    const response = await setViewership(path, viewership);

    apply(response.viewership);
    toast.add({ color: "success", title: message });
    open.value = false;
  } catch (error) {
    reportError(error, t("page.tournaments.viewership.saveError"));
  } finally {
    saving.value = false;
  }
};

const submit = () => {
  const result = parsed.value;

  if (result.ok) {
    void save(result.viewership, t("page.tournaments.viewership.saved"));
  }
};
</script>

<template>
  <SbModal
    v-model:open="open"
    :title="title"
    :description="t('page.tournaments.viewership.description')"
    size="lg"
  >
    <template #body>
      <p v-if="loading" class="text-sm text-muted" aria-live="polite">
        {{ t("page.tournaments.viewership.loading") }}
      </p>

      <div v-else-if="loadFailed" class="flex flex-col items-start gap-2">
        <p class="text-sm text-error">{{ t("page.tournaments.viewership.loadError") }}</p>
        <SbButton
          variant="secondary"
          size="sm"
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
        <SbFormField
          :label="t('page.tournaments.viewership.peakViewers')"
          required
          v-bind="feedback('peakViewers')"
        >
          <SbInput
            v-model="form.peakViewers"
            inputmode="numeric"
            autocomplete="off"
            class="w-full"
          />
        </SbFormField>

        <SbFormField
          :label="t('page.tournaments.viewership.averageViewers')"
          :hint="t('page.tournaments.viewership.optional')"
          v-bind="feedback('averageViewers')"
        >
          <SbInput
            v-model="form.averageViewers"
            inputmode="numeric"
            autocomplete="off"
            class="w-full"
          />
        </SbFormField>

        <SbFormField :label="t('page.tournaments.viewership.scope')">
          <USelect
            v-model="form.scope"
            :items="scopeOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </SbFormField>

        <SbFormField
          :label="t('page.tournaments.viewership.measuredAt')"
          :hint="t('page.tournaments.viewership.optional')"
          v-bind="feedback('measuredAt')"
        >
          <SbInput v-model="form.measuredAt" type="datetime-local" step="1" class="w-full" />
        </SbFormField>

        <SbFormField
          :label="t('page.tournaments.viewership.sourceName')"
          required
          v-bind="feedback('sourceName')"
        >
          <SbInput
            v-model="form.sourceName"
            :maxlength="VIEWERSHIP_SOURCE_NAME_MAX_LENGTH"
            autocomplete="off"
            class="w-full"
            :placeholder="t('page.tournaments.viewership.sourceNamePlaceholder')"
          />
        </SbFormField>

        <SbFormField
          :label="t('page.tournaments.viewership.sourceUrl')"
          required
          v-bind="feedback('sourceUrl')"
        >
          <SbInput
            v-model="form.sourceUrl"
            type="url"
            inputmode="url"
            :maxlength="VIEWERSHIP_SOURCE_URL_MAX_LENGTH"
            class="w-full"
            :placeholder="t('page.tournaments.viewership.sourceUrlPlaceholder')"
          />
        </SbFormField>

        <p class="text-xs text-muted sm:col-span-2">
          {{ t("page.tournaments.viewership.sourceRules") }}
        </p>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full flex-row flex-wrap justify-between gap-2">
        <SbButton
          variant="secondary"
          danger
          icon="i-fluent-delete-24-regular"
          :label="t('page.tournaments.viewership.clear')"
          :disabled="loading || loadFailed || !stored || saving"
          @click="save(null, t('page.tournaments.viewership.cleared'))"
        />
        <div class="flex flex-row gap-2">
          <SbButton
            variant="tertiary"
            :label="t('page.tournaments.viewership.cancel')"
            @click="open = false"
          />
          <SbButton
            type="submit"
            form="viewership-form"
            :label="t('page.tournaments.viewership.save')"
            :loading="saving"
            :disabled="loading || loadFailed || !parsed.ok"
          />
        </div>
      </div>
    </template>
  </SbModal>
</template>
