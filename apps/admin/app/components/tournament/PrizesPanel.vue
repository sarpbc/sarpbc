<script lang="ts" setup>
import type { TournamentDetailParticipant, TournamentPrizes } from "@sarpbc/types";
import {
  CURRENCY_CODE_LENGTH,
  MAX_PRIZE_AMOUNT,
  MAX_PRIZE_ENTRIES,
  MAX_PRIZE_PLAYERS,
  MIN_PRIZE_AMOUNT,
  MIN_PRIZE_PLACEMENT,
  getApiErrorMessage,
  isIso4217Code,
} from "@sarpbc/utils";
import type { TournamentPrizeInput } from "~/composables/tournaments";

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
  sourceUrl: string;
}

const { tournamentId, participants } = defineProps<{
  tournamentId: string;
  prizepool: string | null;
  participants: TournamentDetailParticipant[];
}>();

const { t, n } = useI18n();
const toast = useToast();

const { normalizeSourceUrl, sourceUrlError } = useSourceUrl();

const rows = ref<PrizeRow[]>([]);
const bulkSourceUrl = ref("");
const saving = ref(false);
let nextKey = 0;

const {
  data: distribution,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-tournament-${tournamentId}-prizes`,
  () => getTournamentPrizes(tournamentId),
  { server: false, watch: [() => tournamentId] },
);

const toRows = (value: TournamentPrizes | null | undefined): PrizeRow[] =>
  (value?.prizes ?? []).map((prize) => ({
    key: (nextKey += 1),
    placement: prize.placement,
    amount: prize.amount,
    currency: prize.currency,
    teamId: prize.team.id,
    playerIds: prize.players.map(({ id }) => id),
    sourceUrl: prize.sourceUrl ?? "",
  }));

watch(distribution, (value) => (rows.value = toRows(value)), { immediate: true });

const rosters = computed(
  () => new Map(participants.flatMap(({ team, players }) => (team ? [[team.id, players]] : []))),
);

const isParticipant = (teamId: string | undefined): boolean =>
  teamId !== undefined && rosters.value.has(teamId);

const isOnRoster = (teamId: string | undefined, playerId: string): boolean =>
  (rosters.value.get(teamId ?? "") ?? []).some(({ id }) => id === playerId);

const teamOptions = computed<Option[]>(() => {
  const participantOptions = participants.flatMap(({ team }) =>
    team ? [{ value: team.id, label: team.name }] : [],
  );

  const outsiders = (distribution.value?.prizes ?? [])
    .filter(({ team }) => !isParticipant(team.id))
    .map(({ team }) => ({
      value: team.id,
      label: t("page.tournaments.prizes.notParticipantOption", { name: team.name }),
    }));

  return [...participantOptions, ...outsiders].toSorted((a, b) => a.label.localeCompare(b.label));
});

const playerOptions = (teamId: string | undefined): Option[] => {
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
};

const teamError = (row: PrizeRow): string | undefined =>
  row.teamId && !isParticipant(row.teamId)
    ? t("page.tournaments.prizes.errors.notParticipant")
    : undefined;

const playersError = (row: PrizeRow): string | undefined => {
  if (row.playerIds.length > MAX_PRIZE_PLAYERS) {
    return t("page.tournaments.prizes.errors.tooManyPlayers", { max: MAX_PRIZE_PLAYERS });
  }

  return isParticipant(row.teamId) &&
    row.playerIds.some((playerId) => !isOnRoster(row.teamId, playerId))
    ? t("page.tournaments.prizes.errors.notOnRoster")
    : undefined;
};

const normalizeCurrency = (currency: string): string => currency.trim().toUpperCase();

const isValidAmount = (amount: number | null): amount is number =>
  amount !== null &&
  Number.isInteger(amount) &&
  amount >= MIN_PRIZE_AMOUNT &&
  amount <= MAX_PRIZE_AMOUNT;

const currencyError = (currency: string): string | undefined =>
  isIso4217Code(normalizeCurrency(currency))
    ? undefined
    : t("page.tournaments.prizes.errors.currency");

const duplicateTeam = computed(() => {
  const teamIds = rows.value.map(({ teamId }) => teamId).filter(Boolean);

  return new Set(teamIds).size !== teamIds.length;
});

const toInput = (row: PrizeRow): TournamentPrizeInput | null => {
  const { teamId, amount } = row;

  if (
    !teamId ||
    !isParticipant(teamId) ||
    playersError(row) ||
    !Number.isInteger(row.placement) ||
    row.placement < MIN_PRIZE_PLACEMENT ||
    !isValidAmount(amount) ||
    currencyError(row.currency) ||
    sourceUrlError(row.sourceUrl)
  ) {
    return null;
  }

  return {
    placement: row.placement,
    amount,
    currency: normalizeCurrency(row.currency),
    teamId,
    playerIds: row.playerIds,
    sourceUrl: normalizeSourceUrl(row.sourceUrl),
  };
};

const prizeInputs = computed<TournamentPrizeInput[] | null>(() => {
  if (duplicateTeam.value) {
    return null;
  }

  const inputs: TournamentPrizeInput[] = [];

  for (const row of rows.value) {
    const input = toInput(row);

    if (!input) {
      return null;
    }

    inputs.push(input);
  }

  return inputs;
});

const addRow = () => {
  const last = rows.value.at(-1);
  rows.value.push({
    key: (nextKey += 1),
    placement: last ? last.placement + 1 : 1,
    amount: null,
    currency: last?.currency ?? "USD",
    teamId: undefined,
    playerIds: [],
    sourceUrl: bulkSourceUrl.value.trim(),
  });
};

const applySourceToAll = () => {
  for (const row of rows.value) {
    row.sourceUrl = bulkSourceUrl.value.trim();
  }
};

const removeRow = (key: number) => {
  rows.value = rows.value.filter((row) => row.key !== key);
};

const selectTeam = (row: PrizeRow, teamId: string | undefined) => {
  row.teamId = teamId;
  row.playerIds = [];
};

const save = async () => {
  const inputs = prizeInputs.value;

  if (!inputs) {
    return;
  }

  saving.value = true;

  try {
    distribution.value = await setTournamentPrizes(tournamentId, inputs);
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
};
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

      <div v-if="rows.length > 0" class="flex flex-col gap-2 sm:flex-row sm:items-start">
        <UFormField
          :label="t('page.tournaments.prizes.bulkSource')"
          :hint="t('page.tournaments.prizes.bulkSourceHint')"
          :error="sourceUrlError(bulkSourceUrl)"
          class="min-w-0 flex-1"
        >
          <UInput v-model="bulkSourceUrl" type="url" autocomplete="off" class="w-full" />
        </UFormField>
        <UButton
          class="sm:mt-6"
          variant="soft"
          :label="t('page.tournaments.prizes.applySource')"
          :disabled="!!sourceUrlError(bulkSourceUrl)"
          @click="applySourceToAll"
        />
      </div>

      <div
        v-for="row in rows"
        :key="row.key"
        class="grid grid-cols-1 gap-2 border border-default p-3 sm:grid-cols-[6rem_8rem_6rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
      >
        <UFormField :label="t('page.tournaments.prizes.placement')">
          <UInputNumber
            v-model="row.placement"
            :min="MIN_PRIZE_PLACEMENT"
            :step="1"
            class="w-full"
          />
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
            :min="MIN_PRIZE_AMOUNT"
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
            :maxlength="CURRENCY_CODE_LENGTH"
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

        <UFormField
          :label="t('common.sourceUrl')"
          :error="sourceUrlError(row.sourceUrl)"
          class="sm:col-span-full"
        >
          <UInput v-model="row.sourceUrl" type="url" autocomplete="off" class="w-full" />
          <template v-if="row.sourceUrl.trim() && !sourceUrlError(row.sourceUrl)" #help>
            <ULink
              :to="row.sourceUrl.trim()"
              external
              target="_blank"
              class="break-all text-primary hover:underline"
            >
              {{ t("common.openSource") }}
            </ULink>
          </template>
        </UFormField>
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
