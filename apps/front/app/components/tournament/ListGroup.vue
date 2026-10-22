<script lang="ts" setup>
import { tournamentEventPath, tournamentStagePath } from "@sarpbc/utils";
import type { Tournament, TournamentEvent } from "~/types/tournament";

const { events, to } = defineProps<{
  events: TournamentEvent[];
  /** Overrides the stage link (pick'ems); the event name then stays plain text. */
  to?: (stage: Tournament) => string;
}>();

const { t, te } = useI18n();
const localePath = useLocalePath();
const { formatTournamentPrizepool } = useCurrency();

function eventMeta(event: TournamentEvent): string {
  const typeKey = `components.tournaments.${event.type}`;
  return [event.type && te(typeKey) ? t(typeKey) : "", formatTournamentPrizepool(event.prizepool)]
    .filter(Boolean)
    .join(" · ");
}

function stageHref(event: TournamentEvent, stage: Tournament): string {
  return to ? to(stage) : localePath(tournamentStagePath(event.slug, stage.slug));
}
</script>

<template>
  <section class="w-full flex flex-col">
    <SRail v-for="event in events" :key="event.id" caption="section">
      <template #caption>
        <div class="flex w-full min-w-0 items-center gap-2 pr-2">
          <NuxtImg
            v-if="event.logoUrl"
            :src="event.logoUrl"
            alt=""
            width="16"
            height="16"
            sizes="16px"
            loading="lazy"
            class="size-4 shrink-0 object-contain"
          />
          <h2 class="min-w-0 flex-1 truncate">
            <span v-if="to">{{ event.name }}</span>
            <SLink v-else :to="localePath(tournamentEventPath(event.slug))" variant="inline">
              {{ event.name }}
            </SLink>
          </h2>
          <span
            v-if="eventMeta(event)"
            class="shrink-0 truncate text-xs font-normal text-muted tabular-nums"
          >
            {{ eventMeta(event) }}
          </span>
        </div>
      </template>

      <SCard flush-bottom flush-top>
        <TournamentRow
          v-for="stage in event.stages"
          :key="stage.id"
          :tournament="stage"
          :to="stageHref(event, stage)"
        />
      </SCard>
    </SRail>
  </section>
</template>
