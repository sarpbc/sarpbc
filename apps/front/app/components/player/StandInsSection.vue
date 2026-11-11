<script lang="ts" setup>
import type { PlayerStandIn } from "@sarpbc/types";
import { matchPath, participantName, tournamentStageLabel } from "@sarpbc/utils";
import { STARTGG_URL } from "~/composables/prizes";

const {
  standIns,
  pending = false,
  hasError = false,
} = defineProps<{
  standIns: PlayerStandIn[];
  pending?: boolean;
  hasError?: boolean;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t, locale } = useI18n();

const headingId = "player-stand-ins-title";

const mediumDate = computed(() => mediumDateFormatter(locale.value));

const rows = computed(() =>
  standIns.map(({ participantId, match }) => {
    const team = match.participants.find((participant) => participant.id === participantId);
    const opponent = match.participants.find((participant) => participant.id !== participantId);
    return {
      id: match.id,
      path: matchPath(match.publicId, match.slug),
      title: t("page.player.slug.standIns.forTeam", {
        team: team ? participantName(team) : t("components.match.tbd"),
        opponent: opponent ? participantName(opponent) : t("components.match.tbd"),
      }),
      meta: [
        tournamentStageLabel(match.tournament),
        match.beginAt ? mediumDate.value.format(new Date(match.beginAt)) : null,
      ]
        .filter((part) => part !== null)
        .join(" · "),
    };
  }),
);

const hasStartgg = computed(() => standIns.some((standIn) => standIn.startgg));
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.standIns.title") }}
        </h2>
      </template>

      <SCard v-if="pending" aria-live="polite">
        <SListItem v-for="index in 2" :key="index">
          <div class="flex w-full min-w-0 flex-col gap-0.5">
            <USkeleton class="h-3.5 w-3/5 max-w-48" />
            <USkeleton class="h-3 w-2/5 max-w-32" />
          </div>
        </SListItem>
      </SCard>

      <SCard v-else-if="hasError">
        <SErrorState :message="t('page.player.slug.standIns.error')" @retry="emit('retry')" />
      </SCard>

      <SCard v-else-if="rows.length > 0">
        <ul>
          <li v-for="row in rows" :key="row.id">
            <SListItem :to="$localePath(row.path)" class="min-w-0">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-default group-hover:text-highlighted">
                  {{ row.title }}
                </p>
                <p class="truncate text-xs text-muted">{{ row.meta }}</p>
              </div>
            </SListItem>
          </li>
        </ul>
        <p v-if="hasStartgg" class="flex h-row items-center px-2 text-xs text-muted">
          <span>
            {{ t("common.prizes.dataFrom") }}
            <SLink :to="STARTGG_URL" external target="_blank" variant="inline">start.gg</SLink>
          </span>
        </p>
      </SCard>
    </SRail>
  </section>
</template>
