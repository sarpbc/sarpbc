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

const linkClass = computed(() => ["block transition-none hover:bg-elevated/50", attrs.class]);

const delegatedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});

function onClick() {
  trackMatchRowClicked({ matchId, source, status });
}
</script>

<template>
  <ULink :to="to" :class="linkClass" v-bind="delegatedAttrs" @click="onClick">
    <slot />
  </ULink>
</template>
