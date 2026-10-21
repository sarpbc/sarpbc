<script lang="ts" setup>
import { matchPath } from "@sarpbc/utils";
import type { MatchLinkTarget } from "~/types/matches";
import type { MatchDiscoverySource, MatchDiscoveryStatus } from "~/utils/matchDiscoveryAnalytics";

defineOptions({ inheritAttrs: false });

const { match, source, status } = defineProps<{
  match: MatchLinkTarget;
  source?: MatchDiscoverySource;
  status: MatchDiscoveryStatus;
}>();

const attrs = useAttrs();
const localePath = useLocalePath();
const { matchDetailTo, trackMatchRowClicked } = useMatchDiscoveryAnalytics();

const to = computed(() =>
  source ? matchDetailTo(match, source) : localePath(matchPath(match.publicId, match.slug)),
);

const linkClass = computed(() => ["block interactive-surface", attrs.class]);

const delegatedAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});

function onClick() {
  if (!source) {
    return;
  }
  trackMatchRowClicked({ matchId: match.id, source, status });
}
</script>

<template>
  <ULink :to="to" :class="linkClass" v-bind="delegatedAttrs" @click="onClick">
    <slot />
  </ULink>
</template>
