<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";
import type { SeasonParticipant, Team } from "@sarpbc/types";

const props = defineProps<{
  seasonId: string;
  participants: SeasonParticipant[];
  winnerTeamId: string | null;
}>();

const emit = defineEmits<{ changed: [] }>();

const { t } = useI18n();
const toast = useToast();
const reportError = useReportError();

const query = ref("");
const results = ref<Team[]>([]);
const searching = ref(false);
const adding = ref(false);
const participantToRemove = ref<SeasonParticipant | null>(null);

const takenTeamIds = computed(() => new Set(props.participants.map(({ team }) => team.id)));
const candidates = computed(() => results.value.filter((team) => !takenTeamIds.value.has(team.id)));

async function runSearch(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    results.value = [];

    return;
  }

  searching.value = true;

  try {
    results.value = await searchTeams(trimmed);
  } catch (searchError) {
    results.value = [];
    reportError(searchError);
  } finally {
    searching.value = false;
  }
}

watchDebounced(query, runSearch, { debounce: SEARCH_DEBOUNCE_MS });

async function add(team: Team) {
  adding.value = true;

  try {
    await createSeasonParticipant(props.seasonId, { teamId: team.id });
    toast.add({
      title: t("page.seasons.participants.added", { name: team.name }),
      color: "success",
    });
    query.value = "";
    results.value = [];
    emit("changed");
  } catch (addError) {
    reportError(addError, t("page.seasons.participants.addFailed"));
  } finally {
    adding.value = false;
  }
}
</script>

<template>
  <section class="flex flex-col gap-3 border border-default p-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold">{{ $t("page.seasons.participants.title") }}</h2>
      <p class="text-sm text-muted">{{ $t("page.seasons.participants.hint") }}</p>
    </div>

    <div class="flex max-w-xl flex-col gap-2">
      <UInput
        v-model="query"
        :loading="searching"
        :disabled="adding"
        :placeholder="$t('page.seasons.participants.searchTeam')"
        :aria-label="$t('page.seasons.participants.searchTeam')"
        icon="i-fluent-search-24-regular"
        autocomplete="off"
        class="w-full"
      />
      <div v-if="query.trim() && !searching" class="max-h-56 overflow-y-auto overscroll-contain">
        <ul v-if="candidates.length" class="flex flex-col gap-1">
          <li v-for="team in candidates" :key="team.id">
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="sm"
              block
              class="justify-start"
              icon="i-fluent-add-24-regular"
              :label="team.name"
              :disabled="adding"
              @click="add(team)"
            />
          </li>
        </ul>
        <p v-else class="text-sm text-muted">{{ $t("page.seasons.participants.noTeams") }}</p>
      </div>
    </div>

    <p v-if="participants.length === 0" class="text-sm text-muted">
      {{ $t("page.seasons.participants.empty") }}
    </p>

    <ul v-else class="flex flex-col gap-3">
      <li v-for="participant in participants" :key="participant.id">
        <SeasonParticipantCard
          :season-id="seasonId"
          :participant="participant"
          :is-winner="participant.team.id === winnerTeamId"
          @changed="emit('changed')"
          @remove="participantToRemove = participant"
        />
      </li>
    </ul>

    <ConfirmDeleteModal
      v-model:target="participantToRemove"
      :title="$t('page.seasons.participants.remove.title')"
      :confirm-label="$t('page.seasons.participants.remove.confirmButton')"
      :message="
        (target) => $t('page.seasons.participants.remove.confirm', { name: target.team.name })
      "
      :remove="(target) => deleteSeasonParticipant(seasonId, target.id)"
      @deleted="emit('changed')"
    />
  </section>
</template>
