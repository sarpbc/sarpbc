<script lang="ts" setup>
import { EMPTY_BRACKET_SIZES } from "@sarpbc/types";
import type { EmptyBracketSize } from "@sarpbc/types";

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
    label: t("page.tournaments.emptyBracket.size", { matches: size - 1, teams: size }),
    value: size,
  })),
);

const create = async () => {
  creating.value = true;

  try {
    await createEmptyBracket(tournamentId, {
      numberOfGames: numberOfGames.value || undefined,
      teams: teams.value,
    });
    toast.add({ color: "success", title: t("page.tournaments.emptyBracket.created") });
    open.value = false;
    emit("created");
  } catch (error) {
    reportError(error, t("page.tournaments.emptyBracket.createError"));
  } finally {
    creating.value = false;
  }
};
</script>

<template>
  <SbModal
    v-model:open="open"
    :title="t('page.tournaments.emptyBracket.title')"
    :description="t('page.tournaments.emptyBracket.description')"
  >
    <template #body>
      <div class="grid gap-4 sm:grid-cols-2">
        <SbFormField :label="t('page.tournaments.emptyBracket.teams')">
          <SbSelect v-model="teams" :items="teamItems" class="w-full" />
        </SbFormField>
        <SbFormField
          :label="t('page.tournaments.emptyBracket.numberOfGames')"
          :help="t('page.tournaments.emptyBracket.numberOfGamesHelp')"
        >
          <SbInputNumber v-model="numberOfGames" :min="1" :max="9" class="w-full" />
        </SbFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-row justify-end gap-2">
        <SbButton
          variant="tertiary"
          :label="t('page.tournaments.emptyBracket.cancel')"
          @click="open = false"
        />
        <SbButton
          :label="t('page.tournaments.emptyBracket.create')"
          :loading="creating"
          @click="create"
        />
      </div>
    </template>
  </SbModal>
</template>
