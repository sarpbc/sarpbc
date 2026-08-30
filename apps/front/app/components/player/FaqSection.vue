<script lang="ts" setup>
import type { PlayerTrophyListItem } from "~/composables/player/usePlayerTrophies";
import type { Player } from "~/types/player";
import { resolvePlayerNationalityDemonym } from "~/utils/playerNationalityDemonym";
import { buildFaqPage } from "~/utils/structuredData/faqPage";
import { formatTrophyHighlightNames } from "~/utils/tournamentEventDisplayName";

const { player, trophies } = defineProps<{
  player: Player;
  trophies: PlayerTrophyListItem[];
}>();

const { t, te } = useI18n();
const { setJsonLd } = useStructuredData();

const faqItems = computed(() => {
  const name = player.name;
  const teamName = player.team?.name;
  const demonym = resolvePlayerNationalityDemonym(player.nationality, te, t);

  const whoAnswer = teamName
    ? demonym
      ? t("page.player.slug.faq.who.answerWithTeam", {
          name,
          team: teamName,
          nationality: demonym,
        })
      : t("page.player.slug.faq.who.answerWithTeamGeneric", { name, team: teamName })
    : demonym
      ? t("page.player.slug.faq.who.answerFreeAgent", { name, nationality: demonym })
      : t("page.player.slug.faq.who.answerFreeAgentGeneric", { name });

  const ageAnswer =
    player.birthday !== undefined
      ? t("page.player.slug.faq.age.answerWithAge", {
          name,
          age: getAgeFromBirthday(new Date(player.birthday)),
        })
      : t("page.player.slug.faq.age.answerUnknown", { name });

  const trophyAnswer =
    trophies.length > 0
      ? t("page.player.slug.faq.trophies.answerWithWins", {
          name,
          count: trophies.length,
          titles: formatTrophyHighlightNames(trophies),
        })
      : t("page.player.slug.faq.trophies.answerNone", { name });

  return [
    {
      question: t("page.player.slug.faq.who.question", { name }),
      answer: whoAnswer,
    },
    {
      question: t("page.player.slug.faq.age.question", { name }),
      answer: ageAnswer,
    },
    {
      question: t("page.player.slug.faq.trophies.question", { name }),
      answer: trophyAnswer,
    },
  ];
});

const faqJsonLd = computed(() => buildFaqPage(faqItems.value));

setJsonLd("ld-json-player-faq", faqJsonLd);

const headingId = "player-faq-title";
</script>

<template>
  <section :aria-labelledby="headingId">
    <SRail>
      <template #caption>
        <h2 :id="headingId">
          {{ t("page.player.slug.faq.title") }}
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
