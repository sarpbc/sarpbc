<script lang="ts" setup>
import type {
  StatsImport,
  StatsImportItem,
  StatsImportStatus,
  TournamentMatchListItem,
} from "@sarpbc/types";
import { getApiErrorMessage } from "~/utils/apiError";

const POLL_MS = 3000;

const props = defineProps<{
  tournamentId: string;
  matches: TournamentMatchListItem[];
}>();

const { t, locale } = useI18n();
const toast = useToast();

const dateFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }),
);

function formatDate(value: string | null): string {
  return value ? dateFormatter.value.format(new Date(value)) : "—";
}

const group = ref("");
const submitting = ref(false);

const {
  data: imports,
  pending,
  error,
  refresh,
} = await useLazyAsyncData(
  () => `admin-tournament-${props.tournamentId}-stats-imports`,
  () => getStatsImports(props.tournamentId),
  { server: false, watch: [() => props.tournamentId] },
);

const latest = computed<StatsImport | null>(() => imports.value?.[0] ?? null);
const active = computed(
  () => latest.value?.status === "pending" || latest.value?.status === "running",
);

let timer: ReturnType<typeof setInterval> | undefined;
watch(
  active,
  (isActive) => {
    clearInterval(timer);
    timer = isActive ? setInterval(() => refresh(), POLL_MS) : undefined;
  },
  { immediate: true },
);
onBeforeUnmount(() => clearInterval(timer));

const counts = computed(() => {
  const items = latest.value?.items ?? [];
  return {
    imported: items.filter((item) => item.status === "imported").length,
    already: items.filter((item) => item.status === "already_imported").length,
    unmatched: items.filter((item) => item.status === "unmatched").length,
    failed: items.filter((item) => item.status === "failed").length,
  };
});

const attention = computed(() =>
  (latest.value?.items ?? []).filter(
    (item) => item.status === "unmatched" || item.status === "failed",
  ),
);

function statusColor(status: StatsImportStatus) {
  switch (status) {
    case "pending":
    case "running":
      return "info" as const;
    case "completed":
      return "success" as const;
    case "failed":
      return "error" as const;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function matchLabel(matchId: string | null): string | null {
  const match = props.matches.find((candidate) => candidate.id === matchId);
  if (!match) return null;
  const [a, b] = match.participants ?? [];
  return `${a?.team.name ?? "TBD"} vs ${b?.team.name ?? "TBD"}`;
}

const ROW_CLASS =
  "flex flex-col gap-0.5 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4";

function replayUrl(item: StatsImportItem): string {
  return `https://ballchasing.com/replay/${item.replayId}`;
}

function itemMeta(item: StatsImportItem): string {
  const label = matchLabel(item.matchId);
  const target = !label
    ? "—"
    : item.status === "unmatched"
      ? label
      : t("page.tournaments.statsImport.game", { match: label, number: item.gameNumber });
  return `${formatDate(item.playedAt)} · ${target}`;
}

function itemReason(item: StatsImportItem): string {
  switch (item.status) {
    case "unmatched":
      return t(`page.tournaments.statsImport.unmatched.${item.reason}`);
    case "failed":
      return t(`page.tournaments.statsImport.failed.${item.reason}`);
    case "imported":
    case "already_imported":
      return "";
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

async function submit() {
  if (!group.value.trim()) return;
  submitting.value = true;
  try {
    const created = await requestStatsImport(props.tournamentId, group.value.trim());
    imports.value = [created, ...(imports.value ?? [])];
    group.value = "";
    toast.add({ title: t("page.tournaments.statsImport.started"), color: "success" });
  } catch (requestError) {
    toast.add({
      title: t("page.tournaments.statsImport.startError"),
      description: getApiErrorMessage(requestError) ?? undefined,
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="flex flex-col gap-3 border border-default p-4">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold">{{ t("page.tournaments.statsImport.title") }}</h2>
      <p class="text-sm text-muted">{{ t("page.tournaments.statsImport.hint") }}</p>
    </div>

    <form class="flex flex-col gap-2 sm:flex-row sm:items-end" @submit.prevent="submit">
      <UFormField :label="t('page.tournaments.statsImport.group')" class="flex-1">
        <UInput
          v-model="group"
          :placeholder="t('page.tournaments.statsImport.groupPlaceholder')"
          :disabled="active"
          class="w-full"
        />
      </UFormField>
      <UButton
        type="submit"
        icon="i-fluent-arrow-download-24-regular"
        :loading="submitting"
        :disabled="active || !group.trim()"
        :label="t('page.tournaments.statsImport.submit')"
      />
    </form>

    <p v-if="pending && !imports" class="text-sm text-muted" aria-live="polite">
      {{ t("page.tournaments.statsImport.loading") }}
    </p>

    <div v-else-if="error && !imports" class="flex flex-col items-start gap-2">
      <p class="text-sm text-error">{{ t("page.tournaments.statsImport.loadError") }}</p>
      <UButton
        size="sm"
        variant="soft"
        :label="t('page.tournaments.statsImport.retry')"
        @click="refresh()"
      />
    </div>

    <p v-else-if="!latest" class="text-sm text-muted">
      {{ t("page.tournaments.statsImport.empty") }}
    </p>

    <div v-else class="flex flex-col gap-3" aria-live="polite">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <UBadge
          :color="statusColor(latest.status)"
          variant="subtle"
          :label="t(`page.tournaments.statsImport.status.${latest.status}`)"
        />
        <span class="text-muted">
          {{
            t("page.tournaments.statsImport.summary", {
              group: latest.groupId,
              date: formatDate(latest.createdAt),
            })
          }}
        </span>
        <span v-if="latest.total !== null && active" class="tabular-nums text-muted">
          {{
            t("page.tournaments.statsImport.progress", {
              processed: latest.processed,
              total: latest.total,
            })
          }}
        </span>
      </div>

      <p v-if="latest.error" class="text-sm text-error">{{ latest.error }}</p>

      <dl v-if="latest.items.length > 0" class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div v-for="(value, key) in counts" :key="key" class="border border-default p-2">
          <dt class="text-muted">{{ t(`page.tournaments.statsImport.counts.${key}`) }}</dt>
          <dd class="text-lg font-semibold tabular-nums">{{ value }}</dd>
        </div>
      </dl>

      <div v-if="attention.length > 0" class="flex flex-col gap-1">
        <h3 class="text-sm font-medium">{{ t("page.tournaments.statsImport.attention") }}</h3>
        <ul class="divide-y divide-default border-y border-default">
          <li v-for="row in attention" :key="row.replayId" :class="ROW_CLASS">
            <div class="flex min-w-0 flex-col">
              <ULink
                :to="replayUrl(row)"
                target="_blank"
                rel="noopener noreferrer"
                class="truncate text-highlighted"
              >
                {{ row.title }}
              </ULink>
              <span class="text-muted">{{ itemMeta(row) }}</span>
            </div>
            <span :class="row.status === 'failed' ? 'text-error' : 'text-muted'">
              {{ itemReason(row) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
