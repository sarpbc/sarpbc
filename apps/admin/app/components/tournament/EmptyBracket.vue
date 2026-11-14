<script lang="ts" setup>
import { EMPTY_BRACKET_SIZES, type EmptyBracketSize } from "@sarpbc/types";

const { tournamentId } = defineProps<{ tournamentId: string }>();
const open = defineModel<boolean>("open", { default: false });
const emit = defineEmits<{ created: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const teams = ref<EmptyBracketSize>(4);
const numberOfGames = ref<number | undefined>(undefined);
const creating = ref(false);

const teamItems = computed(() =>
  EMPTY_BRACKET_SIZES.map((size) => ({
    value: size,
    label: t("page.tournaments.emptyBracket.size", { teams: size, matches: size - 1 }),
  })),
);

async function create() {
  creating.value = true;

  try {
    await createEmptyBracket(tournamentId, {
      teams: teams.value,
      numberOfGames: numberOfGames.value || undefined,
    });
    toast.add({ title: t("page.tournaments.emptyBracket.created"), color: "success" });
    open.value = false;
    emit("created");
  } catch (error) {
    reportError(error, t("page.tournaments.emptyBracket.createError"));
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('page.tournaments.emptyBracket.title')"
    :description="t('page.tournaments.emptyBracket.description')"
  >
    <template #body>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="t('page.tournaments.emptyBracket.teams')">
          <USelect
            v-model="teams"
            :items="teamItems"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('page.tournaments.emptyBracket.numberOfGames')"
          :help="t('page.tournaments.emptyBracket.numberOfGamesHelp')"
        >
          <UInputNumber v-model="numberOfGames" :min="1" :max="9" class="w-full" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-row justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('page.tournaments.emptyBracket.cancel')"
          @click="open = false"
        />
        <UButton
          :label="t('page.tournaments.emptyBracket.create')"
          :loading="creating"
          @click="create"
        />
      </div>
    </template>
  </UModal>
</template>
