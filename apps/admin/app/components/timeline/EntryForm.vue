<script lang="ts" setup>
import { TIMELINE_ENTRY_KINDS } from "@sarpbc/types";
import type { StaffTimelineEntry, TimelineEntryInput, TimelineEntryKind } from "@sarpbc/types";
import {
  DATA_SOURCE_URL_MAX_LENGTH,
  TIMELINE_MIN_YEAR,
  TIMELINE_NAME_MAX_LENGTH,
  TIMELINE_NOTE_MAX_LENGTH,
  parseIsoDay,
} from "@sarpbc/utils";

const { entry = null } = defineProps<{
  entry?: StaffTimelineEntry | null;
  submitLabel: string;
  loading: boolean;
}>();

const emit = defineEmits<{ submit: [input: TimelineEntryInput] }>();

const { t } = useI18n();
const { sourceUrlError: checkSourceUrl } = useSourceUrl();

const date = ref(entry?.date ?? "");
const kind = ref<TimelineEntryKind>(entry?.kind ?? "patch");
const nameEn = ref(entry?.nameEn ?? "");
const nameFr = ref(entry?.nameFr ?? "");
const noteEn = ref(entry?.noteEn ?? "");
const noteFr = ref(entry?.noteFr ?? "");
const sourceUrl = ref(entry?.sourceUrl ?? "");

const kindOptions = computed(() =>
  TIMELINE_ENTRY_KINDS.map((value) => ({ label: t(`page.timeline.kinds.${value}`), value })),
);

const dateError = computed(() => {
  const day = parseIsoDay(date.value);

  return day && day.year >= TIMELINE_MIN_YEAR
    ? undefined
    : t("page.timeline.form.dateInvalid", { min: TIMELINE_MIN_YEAR });
});

const sourceError = computed(() =>
  sourceUrl.value.trim()
    ? checkSourceUrl(sourceUrl.value)
    : t("page.timeline.form.sourceUrlRequired"),
);

const isValid = computed(
  () =>
    !dateError.value &&
    !sourceError.value &&
    nameEn.value.trim().length > 0 &&
    nameFr.value.trim().length > 0 &&
    noteEn.value.trim().length > 0 &&
    noteFr.value.trim().length > 0,
);

const submit = () => {
  if (!isValid.value) {
    return;
  }

  emit("submit", {
    date: date.value,
    kind: kind.value,
    nameEn: nameEn.value.trim(),
    nameFr: nameFr.value.trim(),
    noteEn: noteEn.value.trim(),
    noteFr: noteFr.value.trim(),
    sourceUrl: sourceUrl.value.trim(),
  });
};
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submit">
    <div class="grid gap-4 sm:grid-cols-2">
      <SFormField :label="$t('page.timeline.form.date')" :error="dateError" required>
        <SInput v-model="date" type="date" class="w-full" />
      </SFormField>
      <SFormField :label="$t('page.timeline.form.kind')" required>
        <SSelect v-model="kind" :items="kindOptions" class="w-full" />
      </SFormField>
    </div>

    <SFormField
      :label="$t('page.timeline.form.nameEn')"
      :hint="$t('page.timeline.form.nameHint')"
      required
    >
      <SInput
        v-model="nameEn"
        :maxlength="TIMELINE_NAME_MAX_LENGTH"
        autocomplete="off"
        class="w-full"
      />
    </SFormField>
    <SFormField :label="$t('page.timeline.form.nameFr')" required>
      <SInput
        v-model="nameFr"
        :maxlength="TIMELINE_NAME_MAX_LENGTH"
        autocomplete="off"
        lang="fr"
        class="w-full"
      />
    </SFormField>

    <SFormField
      :label="$t('page.timeline.form.noteEn')"
      :hint="$t('page.timeline.form.noteHint')"
      required
    >
      <STextarea
        v-model="noteEn"
        :maxlength="TIMELINE_NOTE_MAX_LENGTH"
        :rows="3"
        autoresize
        class="w-full"
      />
    </SFormField>
    <SFormField :label="$t('page.timeline.form.noteFr')" required>
      <STextarea
        v-model="noteFr"
        :maxlength="TIMELINE_NOTE_MAX_LENGTH"
        :rows="3"
        autoresize
        lang="fr"
        class="w-full"
      />
    </SFormField>

    <SFormField
      :label="$t('page.timeline.form.sourceUrl')"
      :hint="$t('page.timeline.form.sourceUrlHint')"
      :error="sourceError"
      required
    >
      <SInput
        v-model="sourceUrl"
        type="url"
        :maxlength="DATA_SOURCE_URL_MAX_LENGTH"
        autocomplete="off"
        spellcheck="false"
        placeholder="https://"
        class="w-full"
      />
    </SFormField>

    <div>
      <SButton type="submit" :label="submitLabel" :loading="loading" :disabled="!isValid" />
    </div>
  </form>
</template>
