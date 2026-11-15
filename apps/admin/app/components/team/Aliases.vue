<script lang="ts" setup>
import type { TableColumn } from "@nuxt/ui";
import type { TeamAlias, TeamAliasInput } from "@sarpbc/types";
import {
  parseTeamAlias,
  TEAM_ALIAS_NAME_MAX_LENGTH,
  TEAM_ALIAS_URL_MAX_LENGTH,
} from "@sarpbc/utils";
import type { TeamAliasError } from "@sarpbc/utils";

type AliasField = "name" | "from" | "to" | "sourceUrl" | "logoUrl" | "pandascoreId";

interface FieldFeedback {
  error?: string;
}

interface AliasForm {
  name: string;
  from: string;
  to: string;
  sourceUrl: string;
  logoUrl: string;
  pandascoreId: string;
}

const { teamId, aliases } = defineProps<{
  teamId: string;
  aliases: TeamAlias[];
}>();

const emit = defineEmits<{ changed: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const dateFormatter = useDateFormatter({
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const isOpen = ref(false);
const saving = ref(false);
const editing = ref<TeamAlias | null>(null);
const aliasToDelete = ref<TeamAlias | null>(null);

const emptyForm = (): AliasForm => ({
  from: "",
  logoUrl: "",
  name: "",
  pandascoreId: "",
  sourceUrl: "",
  to: "",
});

const form = ref<AliasForm>(emptyForm());

const formatDay = (day: string): string => dateFormatter.value.format(new Date(`${day}T00:00:00Z`));

const period = (alias: TeamAlias): string =>
  t("page.teams.aliases.period", {
    from: formatDay(alias.from),
    to: alias.to ? formatDay(alias.to) : t("page.teams.aliases.ongoing"),
  });

const columns: TableColumn<TeamAlias>[] = [
  { accessorKey: "name", header: t("page.teams.aliases.columns.name") },
  { header: t("page.teams.aliases.columns.period"), id: "period" },
  { accessorKey: "sourceUrl", header: t("page.teams.aliases.columns.source") },
  { header: "", id: "actions" },
];

const toInput = (values: AliasForm): TeamAliasInput => {
  const pandascoreId = values.pandascoreId.trim();

  return {
    from: values.from,
    logoUrl: values.logoUrl.trim() || null,
    name: values.name,
    pandascoreId: pandascoreId === "" ? null : Number(pandascoreId),
    sourceUrl: values.sourceUrl,
    to: values.to || null,
  };
};

const fieldOf = (error: TeamAliasError): AliasField => {
  switch (error) {
    case "missing-name":
    case "name-too-long": {
      return "name";
    }

    case "invalid-from": {
      return "from";
    }

    case "invalid-to":
    case "to-not-after-from": {
      return "to";
    }

    case "invalid-source-url":
    case "forbidden-source": {
      return "sourceUrl";
    }

    case "invalid-logo-url":
    case "forbidden-logo-source": {
      return "logoUrl";
    }

    case "invalid-pandascore-id": {
      return "pandascoreId";
    }

    default: {
      const exhaustive: never = error;

      return exhaustive;
    }
  }
};

const parsed = computed(() => parseTeamAlias(toInput(form.value)));

const feedback = (field: AliasField): FieldFeedback => {
  const result = parsed.value;

  if (result.ok || fieldOf(result.error) !== field) {
    return {};
  }

  return { error: t(`page.teams.aliases.errors.${result.error}`) };
};

const openCreate = () => {
  editing.value = null;
  form.value = emptyForm();
  isOpen.value = true;
};

const openEdit = (alias: TeamAlias) => {
  editing.value = alias;
  form.value = {
    from: alias.from,
    logoUrl: alias.logoUrl ?? "",
    name: alias.name,
    pandascoreId: alias.pandascoreId === null ? "" : String(alias.pandascoreId),
    sourceUrl: alias.sourceUrl,
    to: alias.to ?? "",
  };
  isOpen.value = true;
};

const submit = async () => {
  const result = parsed.value;

  if (!result.ok || saving.value) {
    return;
  }

  saving.value = true;

  try {
    await (editing.value
      ? updateTeamAlias(teamId, editing.value.id, result.alias)
      : addTeamAlias(teamId, result.alias));

    toast.add({ color: "success", title: t("page.teams.aliases.saved") });
    isOpen.value = false;
    emit("changed");
  } catch (error) {
    reportError(error, t("page.teams.aliases.saveError"));
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div>
    <div class="mb-1 flex flex-row items-center justify-between">
      <h2 class="text-base font-semibold">{{ t("page.teams.aliases.title") }}</h2>
      <SbButton
        icon="i-fluent-add-24-regular"
        size="sm"
        :label="t('page.teams.aliases.add')"
        @click="openCreate"
      />
    </div>
    <p class="mb-3 text-sm text-muted">{{ t("page.teams.aliases.description") }}</p>

    <UTable :data="aliases" :columns="columns">
      <template #empty>{{ t("page.teams.aliases.empty") }}</template>
      <template #period-cell="{ row }">{{ period(row.original) }}</template>
      <template #sourceUrl-cell="{ row }">
        <ULink
          :to="row.original.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="break-all"
        >
          {{ row.original.sourceUrl }}
        </ULink>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex flex-row gap-1">
          <SbButton
            icon="i-fluent-edit-24-regular"
            variant="tertiary"
            size="sm"
            :aria-label="t('page.teams.aliases.edit')"
            @click="openEdit(row.original)"
          />
          <SbButton
            icon="i-fluent-delete-24-regular"
            variant="tertiary"
            danger
            size="sm"
            :aria-label="t('page.teams.aliases.delete.title')"
            @click="aliasToDelete = row.original"
          />
        </div>
      </template>
    </UTable>

    <UModal
      v-model:open="isOpen"
      :title="editing ? t('page.teams.aliases.edit') : t('page.teams.aliases.add')"
      :dismissible="!saving"
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #body>
        <form
          id="team-alias-form"
          class="grid grid-cols-1 gap-3 sm:grid-cols-2"
          @submit.prevent="submit"
        >
          <SbFormField
            :label="t('page.teams.aliases.fields.name')"
            required
            class="sm:col-span-2"
            v-bind="feedback('name')"
          >
            <SbInput
              v-model="form.name"
              :maxlength="TEAM_ALIAS_NAME_MAX_LENGTH"
              autocomplete="off"
              class="w-full"
            />
          </SbFormField>
          <SbFormField
            :label="t('page.teams.aliases.fields.from')"
            required
            v-bind="feedback('from')"
          >
            <SbInput v-model="form.from" type="date" class="w-full" />
          </SbFormField>
          <SbFormField
            :label="t('page.teams.aliases.fields.to')"
            :help="t('page.teams.aliases.fields.toHelp')"
            v-bind="feedback('to')"
          >
            <SbInput v-model="form.to" type="date" class="w-full" />
          </SbFormField>
          <SbFormField
            :label="t('page.teams.aliases.fields.sourceUrl')"
            :help="t('page.teams.aliases.fields.sourceHelp')"
            required
            class="sm:col-span-2"
            v-bind="feedback('sourceUrl')"
          >
            <SbInput
              v-model="form.sourceUrl"
              type="url"
              inputmode="url"
              :maxlength="TEAM_ALIAS_URL_MAX_LENGTH"
              class="w-full"
            />
          </SbFormField>
          <SbFormField
            :label="t('page.teams.aliases.fields.logoUrl')"
            :hint="t('page.teams.aliases.optional')"
            v-bind="feedback('logoUrl')"
          >
            <SbInput
              v-model="form.logoUrl"
              type="url"
              inputmode="url"
              :maxlength="TEAM_ALIAS_URL_MAX_LENGTH"
              class="w-full"
            />
          </SbFormField>
          <SbFormField
            :label="t('page.teams.aliases.fields.pandascoreId')"
            :hint="t('page.teams.aliases.optional')"
            :help="t('page.teams.aliases.fields.pandascoreHelp')"
            v-bind="feedback('pandascoreId')"
          >
            <SbInput
              v-model="form.pandascoreId"
              inputmode="numeric"
              autocomplete="off"
              class="w-full"
            />
          </SbFormField>
        </form>
      </template>
      <template #footer>
        <SbButton
          type="submit"
          form="team-alias-form"
          icon="i-fluent-save-24-regular"
          :label="t('page.teams.aliases.save')"
          :loading="saving"
          :disabled="!parsed.ok"
        />
        <SbButton
          variant="secondary"
          :label="t('common.cancel')"
          :disabled="saving"
          @click="isOpen = false"
        />
      </template>
    </UModal>

    <ConfirmDeleteModal
      v-model:target="aliasToDelete"
      :title="t('page.teams.aliases.delete.title')"
      :confirm-label="t('page.teams.aliases.delete.confirm_button')"
      :message="(target) => t('page.teams.aliases.delete.confirm', { name: target.name })"
      :remove="(target) => deleteTeamAlias(teamId, target.id)"
      @deleted="emit('changed')"
    />
  </div>
</template>
