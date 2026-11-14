<script lang="ts" setup>
import type { TournamentDetailParticipant } from "@sarpbc/types";

const { participants, tournamentId } = defineProps<{
  tournamentId: string;
  participants: TournamentDetailParticipant[];
}>();

const emit = defineEmits<{ saved: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();
const { normalizeSourceUrl, sourceUrlError } = useSourceUrl();

const teamParticipants = computed(() =>
  participants.flatMap(({ id, team, players, rosterSourceUrl }) =>
    team ? [{ id, team, players, rosterSourceUrl }] : [],
  ),
);

const values = ref<Record<string, string>>({});
const savingId = ref<string | null>(null);

watch(
  teamParticipants,
  (sources) => {
    values.value = Object.fromEntries(
      sources.map(({ id, rosterSourceUrl }) => [id, rosterSourceUrl ?? ""]),
    );
  },
  { immediate: true },
);

const save = async (participant: (typeof teamParticipants.value)[number]) => {
  savingId.value = participant.id;

  try {
    await updateTournament(tournamentId, {
      rosters: [
        {
          teamId: participant.team.id,
          playerIds: participant.players.map(({ id }) => id),
          sourceUrl: normalizeSourceUrl(values.value[participant.id] ?? ""),
        },
      ],
    });
    toast.add({ title: t("page.tournaments.rosterSources.saved"), color: "success" });
    emit("saved");
  } catch (error) {
    reportError(error, t("page.tournaments.rosterSources.saveError"));
  } finally {
    savingId.value = null;
  }
};
</script>

<template>
  <section v-if="teamParticipants.length > 0" class="flex flex-col gap-3 border border-default p-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold">{{ t("page.tournaments.rosterSources.title") }}</h2>
      <p class="text-sm text-muted">{{ t("page.tournaments.rosterSources.hint") }}</p>
    </div>

    <div
      v-for="participant in teamParticipants"
      :key="participant.id"
      class="grid grid-cols-1 gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-start"
    >
      <p class="truncate text-sm font-medium text-highlighted sm:mt-2">
        {{ participant.team.name }}
      </p>
      <UFormField :error="sourceUrlError(values[participant.id] ?? '')">
        <UInput
          v-model="values[participant.id]"
          type="url"
          autocomplete="off"
          :aria-label="`${participant.team.name} · ${t('common.sourceUrl')}`"
          class="w-full"
        />
        <template v-if="participant.rosterSourceUrl" #help>
          <ULink
            :to="participant.rosterSourceUrl"
            external
            target="_blank"
            class="break-all text-primary hover:underline"
          >
            {{ t("common.openSource") }}
          </ULink>
        </template>
      </UFormField>
      <UButton
        variant="soft"
        :label="t('page.tournaments.rosterSources.save')"
        :loading="savingId === participant.id"
        :disabled="!!sourceUrlError(values[participant.id] ?? '')"
        @click="save(participant)"
      />
    </div>
  </section>
</template>
