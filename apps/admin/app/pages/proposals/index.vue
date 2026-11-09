<script lang="ts" setup>
import type { RosterProposal } from "@sarpbc/types";
import { getApiErrorMessage, hasPermission, parseLocale, requiredPermission } from "@sarpbc/utils";

const { t, locale } = useI18n();
const toast = useToast();
const reportError = useReportError();

const breadcrumbItems = [{ label: t("page.proposals.title") }];

const dateFormatter = useDateFormatter({ dateStyle: "medium", timeStyle: "short" });

const user = useUser();
const reviewingId = ref<string | null>(null);

function canReview(proposal: RosterProposal): boolean {
  return hasPermission(user.value, requiredPermission(proposal.change));
}

const { status, data, error, refresh } = await useLazyAsyncData(
  "admin-roster-proposals",
  () => getPendingRosterProposals(),
  { server: false },
);

const proposals = computed(() => data.value?.proposals ?? []);
const names = computed(() => data.value?.names ?? {});

function nameOf(id: string): string {
  return names.value[id] ?? id;
}

function formatValue(key: string, value: string | boolean | null): string {
  if (value === null) return t("page.proposals.values.ongoing");
  if (value === true) return t("page.proposals.values.yes");
  if (value === false) return t("page.proposals.values.no");
  switch (key) {
    case "status":
      return t(`page.proposals.playerStatus.${value}`);
    case "contractRole":
      return t(`common.contractRole.${value}`);
    case "variant":
      return t(`page.proposals.logoVariants.${value}`);
    case "awardType":
      return t(`page.tournaments.awards.types.${value}`);
    default:
      return nameOf(value);
  }
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat(parseLocale(locale.value), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function changeRows(proposal: RosterProposal): { key: string; label: string; value: string }[] {
  const { change } = proposal;
  if (change.kind === "set_tournament_prizes") {
    return [
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
  }
  const shown =
    change.kind === "create_contract" ? { ...change, endDate: change.endDate ?? null } : change;
  const fields: [string, string | boolean | null | undefined][] = Object.entries(shown);
  return fields
    .filter(
      (field): field is [string, string | boolean | null] =>
        !["kind", "logoKey", "logoUrl"].includes(field[0]) && field[1] !== undefined,
    )
    .map(([key, value]) => ({
      key,
      label: t(`page.proposals.fields.${key}`),
      value: formatValue(key, value),
    }));
}

const logoBackgrounds = [
  { key: "light", class: "bg-white" },
  { key: "dark", class: "bg-neutral-950" },
] as const;

async function review(proposal: RosterProposal, action: "approve" | "reject") {
  if (reviewingId.value) return;
  reviewingId.value = proposal.id;
  try {
    await reviewRosterProposal(proposal.id, action);
    toast.add({
      title:
        action === "approve"
          ? t("page.proposals.messages.approved")
          : t("page.proposals.messages.rejected"),
      color: "success",
    });
    await refresh();
  } catch (reviewError) {
    reportError(reviewError, t("page.proposals.messages.reviewError"));
  } finally {
    reviewingId.value = null;
  }
}
</script>

<template>
  <NuxtLayout name="header">
    <template #breadcrumb>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <DashboardContent>
      <div class="flex flex-col gap-4">
        <p class="text-sm text-muted">
          {{ $t("page.proposals.subtitle") }}
        </p>

        <div v-if="status === 'pending'" class="flex flex-col gap-3">
          <div v-for="n in 3" :key="n" class="flex flex-col gap-3 border border-default p-4">
            <div class="h-4 w-1/3 animate-pulse rounded-sm bg-elevated" />
            <div class="h-16 w-full animate-pulse rounded-sm bg-elevated" />
          </div>
        </div>

        <LoadError
          v-else-if="status === 'error'"
          :message="getApiErrorMessage(error) ?? $t('page.proposals.loadError')"
          @retry="refresh()"
        />

        <p v-else-if="proposals.length === 0" class="text-sm text-muted">
          {{ $t("page.proposals.empty") }}
        </p>

        <div v-else class="flex flex-col gap-3">
          <article
            v-for="proposal in proposals"
            :key="proposal.id"
            class="flex flex-col gap-3 border border-default p-4"
          >
            <div class="flex flex-row flex-wrap items-center justify-between gap-2">
              <div class="flex flex-row flex-wrap items-center gap-2 text-sm">
                <UBadge color="primary" variant="subtle">
                  {{ $t(`page.proposals.kinds.${proposal.change.kind}`) }}
                </UBadge>
                <span class="text-muted" translate="no">{{ nameOf(proposal.proposedById) }}</span>
                <span class="text-muted">·</span>
                <span class="text-muted tabular-nums">{{
                  dateFormatter.format(new Date(proposal.createdAt))
                }}</span>
              </div>
              <div v-if="canReview(proposal)" class="flex flex-row items-center gap-1">
                <UButton
                  icon="i-fluent-checkmark-24-regular"
                  :label="$t('page.proposals.approve')"
                  :loading="reviewingId === proposal.id"
                  :disabled="reviewingId !== null"
                  @click="review(proposal, 'approve')"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  :label="$t('page.proposals.reject')"
                  :disabled="reviewingId !== null"
                  @click="review(proposal, 'reject')"
                />
              </div>
            </div>

            <dl class="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <template v-for="row in changeRows(proposal)" :key="row.key">
                <dt class="text-muted">{{ row.label }}</dt>
                <dd class="break-all" translate="no">{{ row.value }}</dd>
              </template>
              <template v-if="proposal.change.kind === 'upload_team_logo'">
                <dt class="sr-only">{{ $t("page.proposals.kinds.upload_team_logo") }}</dt>
                <dd class="col-span-2 flex flex-row flex-wrap gap-3 py-2">
                  <figure
                    v-for="background in logoBackgrounds"
                    :key="background.key"
                    class="flex flex-col items-center gap-1"
                  >
                    <div
                      :class="[
                        background.class,
                        'flex size-32 items-center justify-center rounded-md border border-default p-3',
                      ]"
                    >
                      <img
                        :src="proposal.change.logoUrl"
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
              <dt class="text-muted">{{ $t("page.proposals.fields.sourceUrl") }}</dt>
              <dd class="break-all">
                <ULink
                  :to="proposal.sourceUrl"
                  external
                  target="_blank"
                  class="text-primary hover:underline"
                >
                  {{ proposal.sourceUrl }}
                </ULink>
              </dd>
            </dl>
          </article>
        </div>
      </div>
    </DashboardContent>
  </NuxtLayout>
</template>
