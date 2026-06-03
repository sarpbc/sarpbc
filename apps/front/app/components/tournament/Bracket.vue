<script lang="ts" setup>
import type { Team } from "~/types/team";
import type { DrawnBracketMatch, Tournament } from "~/types/tournament";

interface Props {
  tournament: Tournament;
}

interface BracketMatch {
  matchId: string;
  teamA?: Team;
  teamB?: Team;
  previousMatchA?: {
    id: string;
    type: "winner" | "loser";
  };
  previousMatchB?: {
    id: string;
    type: "winner" | "loser";
  };
}

const { tournament } = defineProps<Props>();
const matchesToDraw = ref<DrawnBracketMatch[]>([]);

const buildBracket = () => {
  const matchesMap = new Map<string, BracketMatch>();

  if (!tournament.matches) {
    return;
  }

  tournament.matches.forEach((match) => {
    matchesMap.set(match.id, {
      matchId: match.id,
      teamA: match.participants?.[0]?.team ?? undefined,
      teamB: match.participants?.[1]?.team ?? undefined,
      previousMatchA: match.previousMatches?.[0]
        ? {
            id: match.previousMatches[0].previousMatch,
            type: match.previousMatches[0].type,
          }
        : undefined,
      previousMatchB: match.previousMatches?.[1]
        ? {
            id: match.previousMatches[1].previousMatch,
            type: match.previousMatches[1].type,
          }
        : undefined,
    });
  });

  const matchesArray = Array.from(matchesMap.values());
  const lastMatch: BracketMatch[] = [];
  for (let i = 0; i < matchesArray.length; i++) {
    let found = false;
    for (let j = 0; j < matchesArray.length; j++) {
      if (
        matchesArray[i]?.previousMatchA &&
        matchesArray[i]?.previousMatchA?.id === matchesArray[j]?.matchId
      ) {
        found = true;
        break;
      }
      if (
        matchesArray[i]?.previousMatchB &&
        matchesArray[i]?.previousMatchB?.id === matchesArray[j]?.matchId
      ) {
        found = true;
        break;
      }
    }
    if (found) {
      lastMatch.push(matchesArray[i]!);
    }
  }

  const drawnMatches: DrawnBracketMatch[] = [];
  const addedMatches = new Map<string, DrawnBracketMatch>();

  const processMatch = (match: BracketMatch): DrawnBracketMatch | string => {
    if (addedMatches.has(match.matchId)) {
      return addedMatches.get(match.matchId)!;
    }

    const drawnMatch: DrawnBracketMatch = {
      matchId: match.matchId,
      teamA: match.teamA,
      teamB: match.teamB,
    };

    addedMatches.set(match.matchId, drawnMatch);

    if (match.previousMatchA) {
      if (match.previousMatchA.type === "winner") {
        const previousMatchA = matchesMap.get(match.previousMatchA.id);
        if (previousMatchA) {
          drawnMatch.previousMatchA = processMatch(previousMatchA);
        }
      } else {
        drawnMatch.previousMatchA = match.previousMatchA.id;
      }
    }

    if (match.previousMatchB) {
      if (match.previousMatchB.type === "winner") {
        const previousMatchB = matchesMap.get(match.previousMatchB.id);
        if (previousMatchB) {
          drawnMatch.previousMatchB = processMatch(previousMatchB);
        }
      } else {
        drawnMatch.previousMatchB = match.previousMatchB.id;
      }
    }

    drawnMatches.push(drawnMatch);
    return drawnMatch;
  };

  lastMatch.forEach((m) => {
    processMatch(m);
  });

  matchesToDraw.value = drawnMatches.filter((m) =>
    lastMatch.find((lm) => lm.matchId === m.matchId),
  );
};

buildBracket();
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <TournamentBracketMatch v-for="match in matchesToDraw" :key="match.matchId" :match="match" />
  </div>
</template>
