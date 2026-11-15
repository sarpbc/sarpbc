<script setup lang="ts">
import { AnchorLink, DESIGN_ADAPTERS, DESIGN_MESSAGES } from "@sarpbc/design";
import { computed, onBeforeUnmount, onMounted, provide, ref } from "vue";

import { COLOR_MODES, colorMode } from "./color-mode.ts";
import { PLAYGROUNDS } from "./playground/playgrounds.ts";
import SampleIcon from "./playground/SampleIcon.vue";
import PlaygroundPanel from "./views/PlaygroundPanel.vue";
import TokenTuner from "./views/TokenTuner.vue";

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

provide(DESIGN_ADAPTERS, {
  icon: SampleIcon,
  link: AnchorLink,
  translate: (message) => DESIGN_MESSAGES[message],
});

const cycleColorMode = (): void => {
  colorMode.value =
    COLOR_MODES[(COLOR_MODES.indexOf(colorMode.value) + 1) % COLOR_MODES.length] ?? "system";
};

const names = computed(() =>
  [...PLAYGROUNDS.keys()].filter((name) =>
    name.toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
);

/* The first component shows when the hash names none. */
const selected = computed(() => (PLAYGROUNDS.has(route.value) ? route.value : "Button"));

const playground = computed(() => PLAYGROUNDS.get(selected.value));
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
      <nav aria-label="Components">
        <section class="nav-group">
          <h2>@sarpbc/design</h2>
          <a
            v-for="name in names"
            :key="name"
            :href="`#/${name}`"
            :aria-current="name === selected ? 'page' : undefined"
          >
            <span>{{ name }}</span>
          </a>
        </section>
      </nav>
    </aside>
    <main class="main">
      <header class="page-header">
        <p class="eyebrow">@sarpbc/design</p>
        <h1>{{ selected }}</h1>
        <p class="lede">Used as <code>S{{ selected }}</code> in the apps.</p>
      </header>
      <PlaygroundPanel
        v-if="playground"
        :key="selected"
        :component="selected"
        :playground="playground"
      />
    </main>
    <TokenTuner />
  </div>
</template>
