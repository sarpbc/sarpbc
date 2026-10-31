<script lang="ts" setup>
import type { TournamentDetailParticipant, TournamentPrizes } from "@sarpbc/types";
import { MAX_PRIZE_AMOUNT, MAX_PRIZE_ENTRIES, isIso4217Code } from "@sarpbc/utils";
import type { TournamentPrizeInput } from "~/composables/tournaments";
import { getApiErrorMessage } from "~/utils/apiError";

interface Option {
  value: string;
  label: string;
}

interface PrizeRow {
  key: number;
  placement: number;
  amount: number | null;
  currency: string;
  teamId: string | undefined;
  playerIds: string[];
}

const props = defineProps<{
  tournamentId: string;
  prizepool: string | null;
  participants: TournamentDetailParticipant[];
}>();

const { t, n } = useI18n();
const toast = useToast();

const rows = ref<PrizeRow[]>([]);
const saving = ref(false);
let nextKey = 0;

const {
  data: distribution,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-tournament-${props.tournamentId}-prizes`,
  () => getTournamentPrizes(props.tournamentId),
  { server: false, watch: [() => props.tournamentId] },
);

function toRows(value: TournamentPrizes | null | undefined): PrizeRow[] {
  return (value?.prizes ?? []).map((prize) => ({
    key: nextKey++,
    placement: prize.placement,
    amount: prize.amount,
    currency: prize.currency,
    teamId: prize.team.id,
    playerIds: prize.players.map(({ id }) => id),
  }));
}

watch(distribution, (value) => (rows.value = toRows(value)), { immediate: true });

const rosters = computed(
  () => new Map(props.participants.map(({ team, players }) => [team.id, players])),
);

function isParticipant(teamId: string | undefined): boolean {
  return teamId !== undefined && rosters.value.has(teamId);
}

function isOnRoster(teamId: string | undefined, playerId: string): boolean {
  return (rosters.value.get(teamId ?? "") ?? []).some(({ id }) => id === playerId);
}

const teamOptions = computed<Option[]>(() => {
  const participants = props.participants.map(({ team }) => ({
    value: team.id,
    label: team.name,
  }));
  const outsiders = (distribution.value?.prizes ?? [])
    .filter(({ team }) => !isParticipant(team.id))
    .map(({ team }) => ({
      value: team.id,
      label: t("page.tournaments.prizes.notParticipantOption", { name: team.name }),
    }));
  return [...participants, ...outsiders].sort((a, b) => a.label.localeCompare(b.label));
});

function playerOptions(teamId: string | undefined): Option[] {
  const roster = (rosters.value.get(teamId ?? "") ?? []).map(({ id, name }) => ({
    value: id,
    label: name,
  }));
  const outsiders = (distribution.value?.prizes ?? [])
    .filter(({ team }) => team.id === teamId)
    .flatMap(({ players }) => players)
    .filter(({ id }) => !isOnRoster(teamId, id))
    .map(({ id, name }) => ({
      value: id,
      label: t("page.tournaments.prizes.notOnRosterOption", { name }),
    }));
  return [...roster, ...outsiders];
}

function teamError(row: PrizeRow): string | undefined {
  return row.teamId && !isParticipant(row.teamId)
    ? t("page.tournaments.prizes.errors.notParticipant")
    : undefined;
}

function playersError(row: PrizeRow): string | undefined {
  return isParticipant(row.teamId) &&
    row.playerIds.some((playerId) => !isOnRoster(row.teamId, playerId))
    ? t("page.tournaments.prizes.errors.notOnRoster")
    : undefined;
}

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

function isValidAmount(amount: number | null): amount is number {
  return amount !== null && Number.isInteger(amount) && amount >= 1 && amount <= MAX_PRIZE_AMOUNT;
}

function currencyError(currency: string): string | undefined {
  return isIso4217Code(normalizeCurrency(currency))
    ? undefined
    : t("page.tournaments.prizes.errors.currency");
}

const duplicateTeam = computed(() => {
  const teamIds = rows.value.map(({ teamId }) => teamId).filter(Boolean);
  return new Set(teamIds).size !== teamIds.length;
});

function toInput(row: PrizeRow): TournamentPrizeInput | null {
  const { teamId, amount } = row;
  if (
    !teamId ||
    !isParticipant(teamId) ||
    playersError(row) ||
    !Number.isInteger(row.placement) ||
    row.placement < 1 ||
    !isValidAmount(amount) ||
    currencyError(row.currency)
  )
    return null;
  return {
    placement: row.placement,
    amount,
    currency: normalizeCurrency(row.currency),
    teamId,
    playerIds: row.playerIds,
  };
}

const prizeInputs = computed<TournamentPrizeInput[] | null>(() => {
  if (duplicateTeam.value) return null;
  const inputs: TournamentPrizeInput[] = [];
  for (const row of rows.value) {
    const input = toInput(row);
    if (!input) return null;
    inputs.push(input);
  }
  return inputs;
});

function addRow() {
  const last = rows.value.at(-1);
  rows.value.push({
    key: nextKey++,
    placement: last ? last.placement + 1 : 1,
    amount: null,
    currency: last?.currency ?? "USD",
    teamId: undefined,
    playerIds: [],
  });
}

function removeRow(key: number) {
  rows.value = rows.value.filter((row) => row.key !== key);
}

function selectTeam(row: PrizeRow, teamId: string | undefined) {
  row.teamId = teamId;
  row.playerIds = [];
}

async function save() {
  const inputs = prizeInputs.value;
  if (!inputs) return;
  saving.value = true;
  try {
    distribution.value = await setTournamentPrizes(props.tournamentId, inputs);
    toast.add({ title: t("page.tournaments.prizes.saved"), color: "success" });
  } catch (saveError) {
    toast.add({
      title: t("page.tournaments.prizes.saveError"),
      description: getApiErrorMessage(saveError) ?? undefined,
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="flex flex-col gap-3 border border-default p-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold">{{ t("page.tournaments.prizes.title") }}</h2>
      <p class="text-sm text-muted">{{ t("page.tournaments.prizes.hint") }}</p>
      <p class="text-sm">
        {{
          prizepool
            ? t("page.tournaments.prizes.prizepool", { prizepool })
            : t("page.tournaments.prizes.noPrizepool")
        }}
      </p>
    </div>

    <p v-if="pending" class="text-sm text-muted" aria-live="polite">
      {{ t("page.tournaments.prizes.loading") }}
    </p>

    <div v-else-if="error" class="flex flex-col items-start gap-2">
      <p class="text-sm text-error">{{ t("page.tournaments.prizes.loadError") }}</p>
      <UButton
        size="sm"
        variant="soft"
        :label="t('page.tournaments.prizes.retry')"
        @click="refresh()"
      />
    </div>

    <template v-else>
      <p v-if="participants.length === 0" class="text-sm text-muted">
        {{ t("page.tournaments.prizes.noParticipants") }}
      </p>

      <p v-if="rows.length === 0" class="text-sm text-muted">
        {{ t("page.tournaments.prizes.empty") }}
      </p>

      <div
        v-for="row in rows"
        :key="row.key"
        class="grid grid-cols-1 gap-2 border border-default p-3 sm:grid-cols-[6rem_8rem_6rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
      >
        <UFormField :label="t('page.tournaments.prizes.placement')">
          <UInputNumber v-model="row.placement" :min="1" :step="1" class="w-full" />
        </UFormField>

        <UFormField
          :label="t('page.tournaments.prizes.amount')"
          :error="
            row.amount !== null && !isValidAmount(row.amount)
              ? t('page.tournaments.prizes.errors.amount', { max: n(MAX_PRIZE_AMOUNT) })
              : undefined
          "
        >
          <UInputNumber
            v-model="row.amount"
            :min="1"
            :max="MAX_PRIZE_AMOUNT"
            :step="1"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('page.tournaments.prizes.currency')"
          :error="currencyError(row.currency)"
        >
          <UInput
            v-model="row.currency"
            maxlength="3"
            autocomplete="off"
            spellcheck="false"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('page.tournaments.prizes.team')" :error="teamError(row)">
          <USelect
            :model-value="row.teamId"
            :items="teamOptions"
            value-key="value"
            label-key="label"
            :placeholder="t('page.tournaments.prizes.selectTeam')"
            class="w-full"
            @update:model-value="selectTeam(row, $event)"
          />
        </UFormField>

        <UFormField :label="t('page.tournaments.prizes.players')" :error="playersError(row)">
          <USelectMenu
            v-model="row.playerIds"
            multiple
            :items="playerOptions(row.teamId)"
            value-key="value"
            label-key="label"
            :disabled="!row.teamId"
            :placeholder="t('page.tournaments.prizes.selectPlayers')"
            class="w-full"
          />
        </UFormField>

        <UButton
          class="sm:mt-6"
          color="error"
          variant="ghost"
          icon="i-fluent-delete-24-regular"
          :aria-label="t('page.tournaments.prizes.remove')"
          @click="removeRow(row.key)"
        />
      </div>

      <p v-if="duplicateTeam" class="text-sm text-error">
        {{ t("page.tournaments.prizes.errors.duplicateTeam") }}
      </p>

      <div class="flex flex-row flex-wrap justify-between gap-2">
        <UButton
          variant="soft"
          icon="i-fluent-add-24-regular"
          :label="t('page.tournaments.prizes.add')"
          :disabled="participants.length === 0 || rows.length >= MAX_PRIZE_ENTRIES"
          @click="addRow"
        />
        <UButton
          :label="t('page.tournaments.prizes.save')"
          :loading="saving"
          :disabled="!prizeInputs"
          @click="save"
        />
      </div>
    </template>
  </section>
</template>
