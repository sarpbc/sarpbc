<script lang="ts" setup>
import type { TableColumn } from "@sarpbc/design";
import type { RosterProposal, StreamInput, Viewership } from "@sarpbc/types";
import { getApiErrorMessage, hasPermission, parseLocale, requiredPermission } from "@sarpbc/utils";

const { t, locale } = useI18n();
const toast = useToast();
const reportError = useReportError();

const breadcrumbItems = [{ label: t("page.proposals.title") }];

const dateFormatter = useDateFormatter({ dateStyle: "medium", timeStyle: "short" });

const user = useUser();

const isDeletion = ({ change }: RosterProposal): boolean =>
  change.kind === "delete_match" || change.kind === "delete_team";

const canReview = (proposal: RosterProposal): boolean =>
  hasPermission(user.value, requiredPermission(proposal.change));

const { status, data, error, refresh } = await useLazyAsyncData(
  "admin-roster-proposals",
  () => getPendingRosterProposals(),
  { server: false },
);

const proposals = computed(() => data.value?.proposals ?? []);
const names = computed(() => data.value?.names ?? {});

const nameOf = (id: string): string => names.value[id] ?? id;

const formatValue = (key: string, value: string | boolean | null): string => {
  if (value === null) {
    return t("page.proposals.values.ongoing");
  }

  if (value === true) {
    return t("page.proposals.values.yes");
  }

  if (value === false) {
    return t("page.proposals.values.no");
  }

  switch (key) {
    case "status": {
      return t(`page.proposals.playerStatus.${value}`);
    }

    case "contractRole": {
      return t(`common.contractRole.${value}`);
    }

    case "variant": {
      return t(`page.proposals.logoVariants.${value}`);
    }

    case "awardType": {
      return t(`page.tournaments.awards.types.${value}`);
    }

    default: {
      return nameOf(value);
    }
  }
};

const formatAmount = (amount: number, currency: string): string =>
  new Intl.NumberFormat(parseLocale(locale.value), {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);

const optionalRow = (
  key: string,
  label: string,
  value: string | undefined,
): { key: string; label: string; value: string }[] =>
  value === undefined ? [] : [{ key, label, value }];

const streamRows = (
  targetKey: "eventId" | "tournamentId" | "matchId",
  targetId: string,
  streams: StreamInput[],
): { key: string; label: string; value: string }[] => [
  { key: targetKey, label: t(`page.proposals.fields.${targetKey}`), value: nameOf(targetId) },
  ...(streams.length === 0
    ? [
        {
          key: "streams",
          label: t("page.proposals.fields.streams"),
          value: t("page.proposals.values.noStreams"),
        },
      ]
    : streams.map((stream, index) => ({
        key: `stream-${index}`,
        label: t("page.proposals.fields.stream", { number: index + 1 }),
        value: [
          stream.url,
          stream.language,
          t(`page.tournaments.streams.kinds.${stream.kind}`),
          ...(stream.channel ? [stream.channel] : []),
        ].join(" · "),
      }))),
];

const viewershipRows = (
  targetKey: "eventId" | "matchId",
  targetId: string,
  viewership: Viewership,
): { key: string; label: string; value: string }[] => {
  const count = new Intl.NumberFormat(parseLocale(locale.value));

  return [
    { key: targetKey, label: t(`page.proposals.fields.${targetKey}`), value: nameOf(targetId) },
    {
      key: "peakViewers",
      label: t("page.tournaments.viewership.peakViewers"),
      value: count.format(viewership.peakViewers),
    },
    ...optionalRow(
      "averageViewers",
      t("page.tournaments.viewership.averageViewers"),
      viewership.averageViewers === null ? undefined : count.format(viewership.averageViewers),
    ),
    {
      key: "scope",
      label: t("page.tournaments.viewership.scope"),
      value: t(`page.tournaments.viewership.scopes.${viewership.scope}`),
    },
    ...optionalRow(
      "measuredAt",
      t("page.tournaments.viewership.measuredAt"),
      viewership.measuredAt === null
        ? undefined
        : dateFormatter.value.format(new Date(viewership.measuredAt)),
    ),
    {
      key: "sourceName",
      label: t("page.tournaments.viewership.sourceName"),
      value: viewership.sourceName,
    },
  ];
};

interface ProposalRow {
  key: string;
  label: string;
  value: string;
}

const prizesRows = (
  change: Extract<RosterProposal["change"], { kind: "set_tournament_prizes" }>,
): ProposalRow[] => [
  {
    key: "tournamentId",
    label: t("page.proposals.fields.tournamentId"),
    value: nameOf(change.tournamentId),
  },
  ...(change.prizes.length === 0
    ? [
        {
          key: "prizes",
          label: t("page.proposals.fields.prizes"),
          value: t("page.proposals.values.noPrizes"),
        },
      ]
    : change.prizes.map((prize) => ({
        key: `prize-${prize.teamId}`,
        label: t(
          "page.proposals.fields.placement",
          { placement: prize.placement },
          prize.placement,
        ),
        value: [
          nameOf(prize.teamId),
          formatAmount(prize.amount, prize.currency),
          ...(prize.playerIds.length > 0 ? [prize.playerIds.map(nameOf).join(", ")] : []),
        ].join(" · "),
      }))),
];

const amountText = (
  amount: number | undefined,
  currency: string | undefined,
): string | undefined => {
  if (amount === undefined) {
    return undefined;
  }

  return currency === undefined ? String(amount) : formatAmount(amount, currency);
};

const prizeUpdateRows = (
  change: Extract<RosterProposal["change"], { kind: "update_tournament_prize" }>,
): ProposalRow[] => {
  const { patch } = change;

  const patched = [
    ...optionalRow(
      "placement",
      t("page.tournaments.prizes.placement"),
      patch.placement === undefined ? undefined : String(patch.placement),
    ),
    ...optionalRow(
      "amount",
      t("page.tournaments.prizes.amount"),
      amountText(patch.amount, patch.currency),
    ),
    ...optionalRow("currency", t("page.tournaments.prizes.currency"), patch.currency),
    ...optionalRow(
      "playerIds",
      t("page.tournaments.prizes.players"),
      patch.playerIds === undefined
        ? undefined
        : patch.playerIds.map(nameOf).join(", ") || t("page.proposals.values.noPlayers"),
    ),
  ];

  return [
    {
      key: "tournamentId",
      label: t("page.proposals.fields.tournamentId"),
      value: nameOf(change.tournamentId),
    },
    { key: "teamId", label: t("page.proposals.fields.teamId"), value: nameOf(change.teamId) },
    ...(patched.length === 0
      ? [
          {
            key: "patch",
            label: t("page.proposals.fields.prizes"),
            value: t("page.proposals.values.sourceOnly"),
          },
        ]
      : patched),
  ];
};

const circuitScaleRows = (
  change: Extract<RosterProposal["change"], { kind: "set_circuit_stage_scale" }>,
): ProposalRow[] => [
  {
    key: "circuitId",
    label: t("page.proposals.fields.circuitId"),
    value: nameOf(change.circuitId),
  },
  {
    key: "tournamentId",
    label: t("page.proposals.fields.tournamentId"),
    value: nameOf(change.tournamentId),
  },
  ...change.scale.map((tier) => ({
    key: `tier-${tier.from}`,
    label: t("page.proposals.fields.tier", { number: tier.from }),
    value: `${tier.from === tier.to ? tier.from : `${tier.from}–${tier.to}`}: ${tier.points}`,
  })),
  {
    key: "worldwide",
    label: t("page.proposals.fields.worldwide"),
    value: change.worldwide ? t("page.proposals.values.yes") : t("page.proposals.values.no"),
  },
  ...(change.regionTeamIds?.length
    ? [
        {
          key: "regionTeamIds",
          label: t("page.proposals.fields.regionTeams"),
          value: change.regionTeamIds.map(nameOf).join(", "),
        },
      ]
    : []),
  ...(change.finishes ?? []).map((finish) => ({
    key: `finish-${finish.teamId}`,
    label: t("page.proposals.fields.finish", { placement: finish.placement }),
    value: nameOf(finish.teamId),
  })),
];

const seasonAwardRows = (
  change: Extract<RosterProposal["change"], { kind: "award_season_player" }>,
): ProposalRow[] => [
  {
    key: "seasonId",
    label: t("page.proposals.fields.seasonId"),
    value: nameOf(change.seasonId),
  },
  {
    key: "playerId",
    label: t("page.proposals.fields.playerId"),
    value: nameOf(change.playerId),
  },
  {
    key: "awardType",
    label: t("page.proposals.fields.awardType"),
    value: t(`page.seasons.awards.types.${change.awardType}`),
  },
  ...(change.region
    ? [{ key: "region", label: t("page.proposals.fields.region"), value: change.region }]
    : []),
  ...(change.presentedBy
    ? [
        {
          key: "presentedBy",
          label: t("page.proposals.fields.presentedBy"),
          value: change.presentedBy,
        },
      ]
    : []),
];

const lineupRows = (
  change: Extract<RosterProposal["change"], { kind: "set_match_lineups" }>,
): ProposalRow[] => {
  const lineups = change.lineups.flatMap((lineup, index) =>
    lineup.playerIds.length > 0
      ? [
          {
            key: `lineup-${lineup.participantId}`,
            label: t("page.proposals.fields.side", { number: index + 1 }),
            value: lineup.playerIds.map(nameOf).join(", "),
          },
        ]
      : [],
  );

  return [
    { key: "matchId", label: t("page.proposals.fields.matchId"), value: nameOf(change.matchId) },
    ...(lineups.length === 0
      ? [
          {
            key: "lineups",
            label: t("page.proposals.fields.lineups"),
            value: t("page.proposals.values.noLineups"),
          },
        ]
      : lineups),
  ];
};

const aliasRows = (
  change: Extract<RosterProposal["change"], { kind: "add_team_alias" | "update_team_alias" }>,
): ProposalRow[] => {
  const { alias } = change;

  return [
    { key: "teamId", label: t("page.proposals.fields.teamId"), value: nameOf(change.teamId) },
    { key: "aliasName", label: t("page.proposals.fields.aliasName"), value: alias.name },
    { key: "aliasFrom", label: t("page.proposals.fields.aliasFrom"), value: alias.from },
    {
      key: "aliasTo",
      label: t("page.proposals.fields.aliasTo"),
      value: alias.to ?? t("page.proposals.values.ongoing"),
    },
    ...(alias.logoUrl
      ? [
          {
            key: "aliasLogoUrl",
            label: t("page.proposals.fields.imageUrl"),
            value: alias.logoUrl,
          },
        ]
      : []),
    ...(alias.pandascoreId === null
      ? []
      : [
          {
            key: "aliasPandascoreId",
            label: t("page.proposals.fields.aliasPandascoreId"),
            value: String(alias.pandascoreId),
          },
        ]),
  ];
};

const changeRows = (proposal: RosterProposal): ProposalRow[] => {
  const { change } = proposal;

  if (change.kind === "set_tournament_prizes") {
    return prizesRows(change);
  }

  if (change.kind === "update_tournament_prize") {
    return prizeUpdateRows(change);
  }

  if (change.kind === "set_circuit_stage_scale") {
    return circuitScaleRows(change);
  }

  if (change.kind === "award_season_player") {
    return seasonAwardRows(change);
  }

  if (change.kind === "set_event_streams") {
    return streamRows("eventId", change.eventId, change.streams);
  }

  if (change.kind === "set_tournament_streams") {
    return streamRows("tournamentId", change.tournamentId, change.streams);
  }

  if (change.kind === "set_match_streams") {
    return streamRows("matchId", change.matchId, change.streams);
  }

  if (change.kind === "set_match_lineups") {
    return lineupRows(change);
  }

  if (change.kind === "add_team_alias" || change.kind === "update_team_alias") {
    return aliasRows(change);
  }

  if (change.kind === "set_event_viewership") {
    return viewershipRows("eventId", change.eventId, change.viewership);
  }

  if (change.kind === "set_match_viewership") {
    return viewershipRows("matchId", change.matchId, change.viewership);
  }

  const shown =
    change.kind === "create_contract" ? { ...change, endDate: change.endDate ?? null } : change;

  const fields: [string, string | boolean | null | undefined][] = Object.entries(shown);

  return fields.flatMap(([key, value]) =>
    ["kind", "logoKey", "logoUrl"].includes(key) || value === undefined
      ? []
      : [{ key, label: t(`page.proposals.fields.${key}`), value: formatValue(key, value) }],
  );
};

const logoBackgrounds = [
  { class: "bg-white", key: "light" },
  { class: "bg-neutral-950", key: "dark" },
] as const;

const columns: TableColumn<RosterProposal>[] = [
  { header: t("page.proposals.columns.kind"), id: "kind" },
  { header: t("page.proposals.columns.change"), id: "change" },
  { header: t("page.proposals.columns.proposedBy"), id: "proposedBy" },
  { header: t("page.proposals.columns.createdAt"), id: "createdAt" },
  { header: "", id: "actions", meta: { align: "end" } },
];

type ReviewAction = "approve" | "reject";

const reviewingIds = ref(new Set<string>());
const selectedIds = ref<string[]>([]);

const isReviewing = (proposal: RosterProposal): boolean => reviewingIds.value.has(proposal.id);

const isSelectable = (proposal: RosterProposal): boolean =>
  canReview(proposal) && !isReviewing(proposal);

const proposalId = (proposal: RosterProposal): string => proposal.id;

const selectable = computed(() => proposals.value.filter(isSelectable));

const selected = computed(() =>
  selectable.value.filter((proposal) => selectedIds.value.includes(proposal.id)),
);

const unselect = (id: string): void => {
  selectedIds.value = selectedIds.value.filter((selectedId) => selectedId !== id);
};

const removeProposal = (id: string): void => {
  unselect(id);

  if (data.value) {
    data.value = {
      ...data.value,
      proposals: data.value.proposals.filter((proposal) => proposal.id !== id),
    };
  }
};

/* The row leaves the list as soon as the API answers, so the queue never reloads between reviews. */
const reviewOne = async (proposal: RosterProposal, action: ReviewAction): Promise<boolean> => {
  reviewingIds.value.add(proposal.id);
  unselect(proposal.id);

  try {
    await reviewRosterProposal(proposal.id, action);
    removeProposal(proposal.id);

    return true;
  } catch (reviewError) {
    reportError(reviewError, t("page.proposals.messages.reviewError"));

    return false;
  } finally {
    reviewingIds.value.delete(proposal.id);
  }
};

const review = async (proposal: RosterProposal, action: ReviewAction): Promise<void> => {
  if (!isReviewing(proposal)) {
    await reviewOne(proposal, action);
  }
};

const bulkAction = ref<ReviewAction | null>(null);

/* Sequential, oldest first: a proposal may depend on an earlier one (a new team, then its contract). */
const reviewSelected = async (action: ReviewAction): Promise<void> => {
  if (bulkAction.value !== null) {
    return;
  }

  bulkAction.value = action;
  const batch = selected.value;
  let reviewed = 0;

  for (const proposal of batch) {
    reviewingIds.value.add(proposal.id);
  }

  try {
    for (const proposal of batch) {
      // oxlint-disable-next-line no-await-in-loop -- order matters, see above
      if (await reviewOne(proposal, action)) {
        reviewed += 1;
      }
    }
  } finally {
    bulkAction.value = null;
  }

  if (reviewed > 0) {
    toast.add({
      color: "success",
      title:
        action === "approve"
          ? t("page.proposals.messages.bulkApproved", { count: reviewed }, reviewed)
          : t("page.proposals.messages.bulkRejected", { count: reviewed }, reviewed),
    });
  }
};
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <SBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ $t("page.proposals.subtitle") }}
        </p>

        <SErrorState
          v-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.proposals.loadError')"
          @retry="refresh()"
        />

        <ClientOnly v-else>
          <div
            v-if="selectable.length > 0"
            class="flex flex-row flex-wrap items-center justify-end gap-2"
          >
            <span class="text-sm text-muted tabular-nums">
              {{ $t("page.proposals.selectedCount", { count: selected.length }, selected.length) }}
            </span>
            <SButton
              icon="i-fluent-checkmark-24-regular"
              size="sm"
              :label="$t('page.proposals.approveSelected')"
              :loading="bulkAction === 'approve'"
              :disabled="selected.length === 0 || bulkAction !== null"
              @click="reviewSelected('approve')"
            />
            <SButton
              variant="tertiary"
              size="sm"
              :label="$t('page.proposals.rejectSelected')"
              :loading="bulkAction === 'reject'"
              :disabled="selected.length === 0 || bulkAction !== null"
              @click="reviewSelected('reject')"
            />
          </div>

          <STable
            v-model:selection="selectedIds"
            :data="proposals"
            :row-id="proposalId"
            :can-check="isSelectable"
            :columns="columns"
            :caption="$t('page.proposals.title')"
            :loading="status === 'pending'"
            sticky
          >
            <template #empty>
              {{ $t("page.proposals.empty") }}
            </template>

            <template #kind-cell="{ row }">
              <SBadge :color="isDeletion(row.original) ? 'danger' : 'info'">
                {{ $t(`page.proposals.kinds.${row.original.change.kind}`) }}
              </SBadge>
            </template>

            <template #change-cell="{ row }">
              <div class="flex min-w-80 flex-col gap-2 py-2 whitespace-normal text-default">
                <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
                  <template v-for="field in changeRows(row.original)" :key="field.key">
                    <dt class="text-muted">{{ field.label }}</dt>
                    <dd class="break-all" translate="no">{{ field.value }}</dd>
                  </template>
                  <template v-if="row.original.change.kind === 'upload_team_logo'">
                    <dt class="sr-only">{{ $t("page.proposals.kinds.upload_team_logo") }}</dt>
                    <dd class="col-span-2 flex flex-row flex-wrap gap-3 py-1">
                      <figure
                        v-for="background in logoBackgrounds"
                        :key="background.key"
                        class="flex flex-col items-center gap-1"
                      >
                        <div
                          :class="[
                            background.class,
                            'flex size-24 items-center justify-center rounded-md border border-default p-2',
                          ]"
                        >
                          <img
                            :src="row.original.change.logoUrl"
                            :alt="$t('page.proposals.logoPreview.alt')"
                            class="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <figcaption class="text-xs text-muted">
                          {{ $t(`page.proposals.logoPreview.${background.key}`) }}
                        </figcaption>
                      </figure>
                    </dd>
                  </template>
                  <template v-if="row.original.sourceUrl">
                    <dt class="text-muted">{{ $t("page.proposals.fields.sourceUrl") }}</dt>
                    <dd class="break-all">
                      <SLink
                        variant="primary"
                        :to="row.original.sourceUrl"
                        external
                        target="_blank"
                      >
                        {{ row.original.sourceUrl }}
                      </SLink>
                    </dd>
                  </template>
                </dl>
                <p v-if="isDeletion(row.original)" class="text-error">
                  {{ $t(`page.proposals.deletionWarning.${row.original.change.kind}`) }}
                </p>
              </div>
            </template>

            <template #proposedBy-cell="{ row }">
              <span translate="no">{{ nameOf(row.original.proposedById) }}</span>
            </template>

            <template #createdAt-cell="{ row }">
              <span class="tabular-nums">{{
                dateFormatter.format(new Date(row.original.createdAt))
              }}</span>
            </template>

            <template #actions-cell="{ row }">
              <div v-if="canReview(row.original)" class="flex flex-row justify-end gap-1">
                <SButton
                  icon="i-fluent-checkmark-24-regular"
                  size="sm"
                  :label="$t('page.proposals.approve')"
                  :loading="isReviewing(row.original)"
                  :disabled="isReviewing(row.original)"
                  @click="review(row.original, 'approve')"
                />
                <SButton
                  variant="tertiary"
                  size="sm"
                  :label="$t('page.proposals.reject')"
                  :disabled="isReviewing(row.original)"
                  @click="review(row.original, 'reject')"
                />
              </div>
            </template>
          </STable>
        </ClientOnly>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
