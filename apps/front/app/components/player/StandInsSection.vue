<script lang="ts" setup>
import type { PlayerStandIn } from "@sarpbc/types";
import { matchPath, participantName, tournamentStageLabel } from "@sarpbc/utils";

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
      meta: [
        tournamentStageLabel(match.tournament),
        match.beginAt ? mediumDate.value.format(new Date(match.beginAt)) : null,
      ]
        .filter((part) => part !== null)
        .join(" · "),
      path: matchPath(match.publicId, match.slug),
      title: t("page.player.slug.standIns.forTeam", {
        opponent: opponent ? participantName(opponent) : t("components.match.tbd"),
        team: team ? participantName(team) : t("components.match.tbd"),
      }),
    };
  }),
);
</script>

<template>
  <section :aria-labelledby="headingId">
    <HubRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.standIns.title") }}
        </h2>
      </template>

      <HubCard v-if="pending" aria-live="polite">
        <HubListItem v-for="index in 2" :key="index">
          <div class="flex w-full min-w-0 flex-col gap-0.5">
            <SSkeleton class="h-3.5 w-3/5 max-w-48" />
            <SSkeleton class="h-3 w-2/5 max-w-32" />
          </div>
        </HubListItem>
      </HubCard>

      <HubCard v-else-if="hasError">
        <SErrorState :message="t('page.player.slug.standIns.error')" @retry="emit('retry')" />
      </HubCard>

      <HubCard v-else-if="rows.length > 0">
        <ul>
          <li v-for="row in rows" :key="row.id">
            <HubListItem :to="$localePath(row.path)" class="min-w-0">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-default group-hover:text-highlighted">
                  {{ row.title }}
                </p>
                <p class="truncate text-xs text-muted">{{ row.meta }}</p>
              </div>
            </HubListItem>
          </li>
        </ul>
      </HubCard>
    </HubRail>
  </section>
</template>
