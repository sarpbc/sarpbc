<script lang="ts" setup>
import type {
  OnThisDayEvent,
  OnThisDayLink,
  OnThisDaySide,
  OnThisDayTournament,
} from "@sarpbc/types";
import {
  matchPath,
  participantName,
  playerPath,
  teamPath,
  tournamentStageLabel,
  tournamentStagePath,
  uiLocale,
} from "@sarpbc/utils";

const { event } = defineProps<{ event: OnThisDayEvent }>();

const { t, locale } = useI18n();
const localePath = useLocalePath();

const sidePath = (side: Omit<OnThisDaySide, "score">): string | null => {
  if (side.team) {
    return localePath(teamPath(side.team.slug));
  }

  const [only, ...others] = side.players;

  return only && others.length === 0 ? localePath(playerPath(only.slug)) : null;
};

const tournamentPath = (tournament: OnThisDayTournament): string =>
  localePath(tournamentStagePath(tournament.event.slug, tournament.slug));

interface LinkTarget {
  label: string;
  to: string;
}

const linkTarget = (link: OnThisDayLink): LinkTarget => {
  switch (link.kind) {
    case "player": {
      return { label: link.name, to: localePath(playerPath(link.slug)) };
    }

    case "team": {
      return { label: link.name, to: localePath(teamPath(link.slug)) };
    }

    case "tournament": {
      return {
        label: tournamentStageLabel(link),
        to: localePath(tournamentStagePath(link.event.slug, link.slug)),
      };
    }

    case "match": {
      return { label: link.name, to: localePath(matchPath(link.publicId, link.slug)) };
    }

    default: {
      const exhaustive: never = link;

      return exhaustive;
    }
  }
};

const factText = computed(() =>
  event.kind === "fact" ? event.text[uiLocale(locale.value)] : null,
);

const factLink = computed(() =>
  event.kind === "fact" && event.link ? linkTarget(event.link) : null,
);

const finalScore = computed(() =>
  event.kind === "final" && event.winner.score !== null && event.loser.score !== null
    ? t("components.onThisDay.score", { winner: event.winner.score, loser: event.loser.score })
    : null,
);
</script>

<template>
  <li class="row-separator flex min-w-0 items-baseline gap-3 px-2 py-2.5">
    <span class="w-10 shrink-0 text-xs text-muted tabular-nums">
      <time v-if="event.kind !== 'fact'" :datetime="event.date">{{ event.year }}</time>
      <template v-else-if="event.year !== null">{{ event.year }}</template>
    </span>

    <p class="min-w-0 flex-1 text-sm text-default">
      <template v-if="event.kind === 'fact'">
        <span>{{ factText }}</span>
        <template v-if="factLink">
          {{ " " }}
          <SLink :to="factLink.to" class="text-xs" translate="no">{{ factLink.label }}</SLink>
        </template>
        <template v-if="event.sourceUrl">
          {{ " · " }}
          <SLink :to="event.sourceUrl" target="_blank" rel="noopener noreferrer" class="text-xs">
            {{ t("components.onThisDay.source") }}
          </SLink>
        </template>
      </template>

      <i18n-t
        v-else-if="event.kind === 'title'"
        keypath="components.onThisDay.line.title"
        tag="span"
        scope="global"
      >
        <template #winner>
          <SLink
            v-if="sidePath(event.winner)"
            :to="sidePath(event.winner) ?? ''"
            variant="inline"
            class="font-medium"
            translate="no"
          >
            {{ participantName(event.winner) }}
          </SLink>
          <span v-else class="font-medium" translate="no">
            {{ participantName(event.winner) }}
          </span>
        </template>
        <template #tournament>
          <SLink :to="tournamentPath(event.tournament)" variant="inline" translate="no">
            {{ tournamentStageLabel(event.tournament) }}
          </SLink>
        </template>
      </i18n-t>

      <i18n-t
        v-else-if="event.kind === 'final'"
        :keypath="
          finalScore ? 'components.onThisDay.line.final' : 'components.onThisDay.line.finalNoScore'
        "
        tag="span"
        scope="global"
      >
        <template #winner>
          <span class="font-medium" translate="no">{{ participantName(event.winner) }}</span>
        </template>
        <template #loser>
          <span translate="no">{{ participantName(event.loser) }}</span>
        </template>
        <template #score>
          <SLink
            :to="localePath(matchPath(event.match.publicId, event.match.slug))"
            variant="inline"
            class="tabular-nums"
          >
            {{ finalScore }}
          </SLink>
        </template>
        <template #tournament>
          <SLink :to="tournamentPath(event.tournament)" variant="inline" translate="no">
            {{ tournamentStageLabel(event.tournament) }}
          </SLink>
        </template>
      </i18n-t>

      <i18n-t
        v-else
        :keypath="`components.onThisDay.line.transfer.${event.type}`"
        tag="span"
        scope="global"
      >
        <template #player>
          <SLink
            :to="localePath(playerPath(event.player.slug))"
            variant="inline"
            class="font-medium"
            translate="no"
          >
            {{ event.player.name }}
          </SLink>
        </template>
        <template #team>
          <SLink :to="localePath(teamPath(event.team.slug))" variant="inline" translate="no">
            {{ event.team.name }}
          </SLink>
        </template>
      </i18n-t>
    </p>
  </li>
</template>
