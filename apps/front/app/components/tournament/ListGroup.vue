<script lang="ts" setup>
import type { Tournament } from "~/types/tournament";
import type { TournamentEventGroup } from "~/utils/groupTournamentsByEvent";
import { groupTournamentsByEvent } from "~/utils/groupTournamentsByEvent";

const { tournaments, to } = defineProps<{
  tournaments: Tournament[];
  to?: (tournament: Tournament) => string;
}>();

const { t, te } = useI18n();
const { formatTournamentPrizepool } = useCurrency();

const groups = computed(() => groupTournamentsByEvent(tournaments));

function eventMeta(group: TournamentEventGroup): string {
  const typeKey = `components.tournaments.${group.type}`;
  return [group.type && te(typeKey) ? t(typeKey) : "", formatTournamentPrizepool(group.prizepool)]
    .filter(Boolean)
    .join(" · ");
}
</script>

<template>
  <section class="w-full flex flex-col">
    <SRail v-for="group in groups" :key="group.key" caption="section">
      <template #caption>
        <div class="flex w-full min-w-0 items-center gap-2 pr-2">
          <NuxtImg
            v-if="group.logoUrl"
            :src="group.logoUrl"
            alt=""
            width="16"
            height="16"
            sizes="16px"
            loading="lazy"
            class="size-4 shrink-0 object-contain"
          />
          <h2 class="min-w-0 flex-1 truncate">{{ group.displayName }}</h2>
          <span
            v-if="eventMeta(group)"
            class="shrink-0 truncate text-xs font-normal text-muted tabular-nums"
          >
            {{ eventMeta(group) }}
          </span>
        </div>
      </template>

      <SCard flush-bottom flush-top>
        <TournamentRow
          v-for="stage in group.stages"
          :key="stage.id"
          :tournament="stage"
          :to="to?.(stage)"
        />
      </SCard>
    </SRail>
  </section>
</template>
