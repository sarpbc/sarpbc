<script lang="ts" setup>
import { DateFormatter } from "@internationalized/date";
import type { MatchListItem } from "~/types/matches";
import type { Player } from "~/types/player";
import type { Team } from "~/types/team";
import { buildFaqPage } from "~/utils/structuredData/faqPage";
import { tournamentEventDisplayName } from "~/utils/tournamentEventDisplayName";

const {
  team,
  players,
  upcomingMatches = [],
  liveMatches = [],
} = defineProps<{
  team: Team;
  players: Player[];
  upcomingMatches?: MatchListItem[];
  liveMatches?: MatchListItem[];
}>();

const { t, locale } = useI18n();
const { setJsonLd } = useStructuredData();

const df = computed(() => new DateFormatter(locale.value, { dateStyle: "medium" }));

function opponentName(match: MatchListItem): string {
  const names = (match.participants ?? [])
    .map((participant) => participant.team.name)
    .filter((name) => name.length > 0 && name !== team.name);

  return names[0] ?? t("page.team.slug.faq.upcoming.unknownOpponent");
}

function eventName(match: MatchListItem): string {
  return tournamentEventDisplayName({
    name: match.tournament.name,
    leagueName: match.tournament.league?.name,
    serie: match.tournament.serie,
  });
}

function formatMatchLine(match: MatchListItem, live: boolean): string {
  const opponent = opponentName(match);
  const event = eventName(match);

  if (live) {
    return event
      ? t("page.team.slug.faq.upcoming.matchLiveWithEvent", { opponent, event })
      : t("page.team.slug.faq.upcoming.matchLive", { opponent });
  }

  const date = match.beginAt
    ? df.value.format(new Date(match.beginAt))
    : t("page.team.slug.faq.upcoming.dateTbd");

  return event
    ? t("page.team.slug.faq.upcoming.matchVsWithEvent", { opponent, event, date })
    : t("page.team.slug.faq.upcoming.matchVs", { opponent, date });
}

const faqItems = computed(() => {
  const name = team.name;

  const rosterAnswer =
    players.length > 0
      ? t("page.team.slug.faq.roster.answerWithPlayers", {
          name,
          players: players.map((player) => player.name).join(", "),
        })
      : t("page.team.slug.faq.roster.answerEmpty", { name });

  const matchLines = [
    ...liveMatches.map((match) => formatMatchLine(match, true)),
    ...upcomingMatches.slice(0, 3).map((match) => formatMatchLine(match, false)),
  ];

  const upcomingAnswer =
    matchLines.length > 0
      ? t("page.team.slug.faq.upcoming.answerWithMatches", {
          name,
          matches: matchLines.join(", "),
        })
      : t("page.team.slug.faq.upcoming.answerNone", { name });

  return [
    {
      question: t("page.team.slug.faq.roster.question", { name }),
      answer: rosterAnswer,
    },
    {
      question: t("page.team.slug.faq.rank.question", { name }),
      answer: t("page.team.slug.faq.rank.answerUnknown", { name }),
    },
    {
      question: t("page.team.slug.faq.upcoming.question", { name }),
      answer: upcomingAnswer,
    },
  ];
});

const faqJsonLd = computed(() => buildFaqPage(faqItems.value));

setJsonLd("ld-json-team-faq", faqJsonLd);

const headingId = "team-faq-title";
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.team.slug.faq.title") }}
        </h2>
      </template>
      <SCard class="divide-y divide-default">
        <details v-for="(item, index) in faqItems" :key="index" class="group px-4 py-3">
          <summary class="cursor-default text-sm font-medium text-highlighted marker:content-none">
            <span class="flex items-center justify-between gap-3">
              {{ item.question }}
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </span>
          </summary>
          <p class="mt-2 text-sm text-default text-pretty">
            {{ item.answer }}
          </p>
        </details>
      </SCard>
    </SRail>
  </section>
</template>
