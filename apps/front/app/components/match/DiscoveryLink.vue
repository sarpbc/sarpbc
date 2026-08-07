<script lang="ts" setup>
import type { MatchDiscoverySource, MatchDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";

defineOptions({ inheritAttrs: false });

const { matchId, source, status } = defineProps<{
  matchId: string;
  source: MatchDiscoverySource;
  status: MatchDiscoveryStatus;
}>();

const attrs = useAttrs();
const { matchDetailTo, trackMatchRowClicked } = useMatchDiscoveryAnalytics();

const to = computed(() => matchDetailTo(matchId, source));

function onClick() {
  trackMatchRowClicked({ matchId, source, status });
}
</script>

<template>
  <ULink :to="to" v-bind="attrs" @click="onClick">
    <slot />
  </ULink>
</template>
