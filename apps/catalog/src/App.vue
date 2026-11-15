<script setup lang="ts">
import { AnchorLink, DESIGN_ADAPTERS } from "@sarpbc/design";
import { computed, onBeforeUnmount, onMounted, provide, ref } from "vue";

import { CATEGORIES, categoryOf, inventory } from "./catalog.ts";
import { COLOR_MODES, colorMode } from "./color-mode.ts";
import { PARITY_CASES } from "./parity/cases.ts";
import SampleIcon from "./parity/SampleIcon.vue";
import ComponentView from "./views/ComponentView.vue";
import OverviewView from "./views/OverviewView.vue";
import ParityView from "./views/ParityView.vue";
import TokenTuner from "./views/TokenTuner.vue";

const DESIGN_PREFIX = "design/";

const readHash = (): string => decodeURIComponent(location.hash.replace(/^#\/?/u, ""));

const route = ref(readHash());
const query = ref("");

const syncRoute = (): void => {
  route.value = readHash();
};

onMounted(() => {
  addEventListener("hashchange", syncRoute);
});

onBeforeUnmount(() => {
  removeEventListener("hashchange", syncRoute);
});

provide(DESIGN_ADAPTERS, { icon: SampleIcon, link: AnchorLink });

const cycleColorMode = (): void => {
  colorMode.value =
    COLOR_MODES[(COLOR_MODES.indexOf(colorMode.value) + 1) % COLOR_MODES.length] ?? "system";
};

const needle = computed(() => query.value.trim().toLowerCase());

const parity = computed(() =>
  PARITY_CASES.find((entry) => `${DESIGN_PREFIX}${entry.name}` === route.value),
);

const selected = computed(() =>
  inventory.components.find((component) => component.name === route.value),
);

const designCases = computed(() =>
  PARITY_CASES.filter((entry) => entry.name.toLowerCase().includes(needle.value)),
);

const replaced = new Set(PARITY_CASES.map((entry) => entry.nuxtUi));

const groups = computed(() =>
  CATEGORIES.flatMap((category) => {
    const components = inventory.components
      .filter(
        (component) =>
          categoryOf(component) === category && component.name.toLowerCase().includes(needle.value),
      )
      .toSorted((left, right) => left.name.localeCompare(right.name));

    return components.length === 0 ? [] : [{ category, components }];
  }),
);
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <a href="#/">sarpbc.org <span>catalog</span></a>
        <button class="mode" type="button" @click="cycleColorMode">{{ colorMode }}</button>
      </div>
      <input
        v-model="query"
        class="search"
        type="search"
        placeholder="Filter components"
        aria-label="Filter components"
      />
      <nav aria-label="Design system">
        <section v-if="designCases.length > 0" class="nav-group">
          <h2>@sarpbc/design</h2>
          <a
            v-for="entry in designCases"
            :key="entry.name"
            :href="`#/${DESIGN_PREFIX}${entry.name}`"
            :aria-current="entry === parity ? 'page' : undefined"
          >
            <span>{{ entry.name }}</span>
          </a>
        </section>
      </nav>
      <nav aria-label="Nuxt UI components">
        <section v-for="group in groups" :key="group.category" class="nav-group">
          <h2>{{ group.category }}</h2>
          <a
            v-for="component in group.components"
            :key="component.name"
            :href="`#/${component.name}`"
            :aria-current="component.name === route ? 'page' : undefined"
          >
            <span :class="{ replaced: replaced.has(component.name) }">{{ component.name }}</span>
            <span class="count">{{ component.total }}</span>
          </a>
        </section>
      </nav>
    </aside>
    <main class="main">
      <ParityView v-if="parity" :key="parity.name" :parity="parity" />
      <ComponentView v-else-if="selected" :key="selected.name" :component="selected" />
      <OverviewView v-else />
    </main>
    <TokenTuner />
  </div>
</template>
