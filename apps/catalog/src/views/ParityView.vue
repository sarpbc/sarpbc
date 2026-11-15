<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { isDark } from "../color-mode.ts";
import { callOf } from "../parity/call.ts";
import { PLAYGROUNDS } from "../parity/playground.ts";
import ReferenceFrame from "../parity/ReferenceFrame.vue";
import PlaygroundPanel from "./PlaygroundPanel.vue";

import type { ParityCase } from "../parity/cases.ts";
import type { NuxtUiStyles } from "../styles/types.ts";

const { parity } = defineProps<{ parity: ParityCase }>();

const styles = ref<NuxtUiStyles | null>(null);
const failure = ref<string | null>(null);

onMounted(async () => {
  try {
    const module = await import("virtual:nuxt-ui-styles");

    styles.value = module.default;
  } catch (error) {
    failure.value = error instanceof Error ? error.message : String(error);
  }
});

const entries = computed(() =>
  (styles.value?.components ?? []).flatMap((entry) => {
    const css = styles.value?.stylesheets.find((sheet) => sheet.app === entry.app)?.css;

    if (entry.component !== parity.nuxtUi || css === undefined) {
      return [];
    }

    const rows = entry.variants.map((look) => ({ look, props: parity.migrate(look) }));

    return [{ ...entry, css, rows }];
  }),
);

const lookCount = computed(() => entries.value.reduce((sum, entry) => sum + entry.rows.length, 0));

const callCount = computed(
  () =>
    new Set(entries.value.flatMap((entry) => entry.rows.map((row) => JSON.stringify(row.props))))
      .size,
);

const playground = computed(() => PLAYGROUNDS.get(parity.name));
</script>

<template>
  <header class="page-header">
    <p class="eyebrow">@sarpbc/design</p>
    <h1>{{ parity.name }}</h1>
    <p class="lede">
      Replaces <a :href="`#/${parity.nuxtUi}`">{{ parity.nuxtUi }}</a>. Tune it below, then compare
      with production: today's {{ lookCount }} looks become {{ callCount }} distinct calls.
    </p>
  </header>

  <PlaygroundPanel v-if="playground" :key="parity.name" :parity="parity" :playground="playground" />

  <h2 class="parity-title">From production</h2>
  <p v-if="failure !== null" class="empty">Could not resolve styles: {{ failure }}</p>
  <p v-else-if="styles === null" class="empty">Resolving Nuxt UI themes and Tailwind CSS…</p>

  <section v-for="entry in entries" :key="entry.app">
    <h2 class="capitalize">{{ entry.app }}</h2>
    <div class="parity-grid">
      <span class="parity-head">Production today</span>
      <span class="parity-head">Nuxt UI</span>
      <span class="parity-head">@sarpbc/design</span>
      <template v-for="(row, index) in entry.rows" :key="index">
        <div class="parity-look">
          <span class="strong">{{ row.look.count }}×</span>
          <ul class="chips">
            <li v-if="row.look.props.length === 0"><code>defaults</code></li>
            <li v-for="prop in row.look.props" :key="prop.name">
              <code>{{ prop.name }}={{ prop.value }}</code>
            </li>
          </ul>
        </div>
        <ReferenceFrame :css="entry.css" :dark="isDark" :html="parity.reference(row.look)" />
        <div class="parity-ours" :data-app="entry.app">
          <component :is="() => parity.render(row.props)" />
          <code class="parity-call">{{ callOf(parity.name, row.props) }}</code>
        </div>
      </template>
    </div>
  </section>
</template>
