<script setup lang="ts">
import {
  AnchorLink,
  DESIGN_ADAPTERS,
  DESIGN_MESSAGES,
  Input as SInput,
  Kbd as SKbd,
  RadioGroup as SRadioGroup,
} from "@sarpbc/design";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useTemplateRef,
  watch,
} from "vue";

import { COLOR_MODES, colorMode } from "./color-mode.ts";
import { CATEGORIES } from "./playground/model.ts";
import { PLAYGROUNDS } from "./playground/playgrounds.ts";
import CatalogIcon from "./CatalogIcon.vue";
import PlaygroundPanel from "./views/PlaygroundPanel.vue";

const readHash = (): string => decodeURIComponent(location.hash.replace(/^#\/?/u, ""));

const route = ref(readHash());
const query = ref("");
const search = useTemplateRef("search");
const nav = useTemplateRef("nav");
const moreAbove = ref(false);
const moreBelow = ref(false);

const syncFades = (): void => {
  if (nav.value === null) {
    return;
  }

  const { clientHeight, scrollHeight, scrollTop } = nav.value;

  moreAbove.value = scrollTop > 0;
  moreBelow.value = scrollTop + clientHeight < scrollHeight - 1;
};

const syncRoute = (): void => {
  route.value = readHash();
};

const focusSearch = (event: KeyboardEvent): void => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    search.value?.focus();
  }
};

onMounted(() => {
  addEventListener("hashchange", syncRoute);
  addEventListener("keydown", focusSearch);
  addEventListener("resize", syncFades);
  syncFades();
});

onBeforeUnmount(() => {
  removeEventListener("hashchange", syncRoute);
  removeEventListener("keydown", focusSearch);
  removeEventListener("resize", syncFades);
});

provide(DESIGN_ADAPTERS, {
  icon: CatalogIcon,
  link: AnchorLink,
  translate: (message) => DESIGN_MESSAGES[message],
});

const groups = computed(() => {
  const term = query.value.trim().toLowerCase();
  const matches = [...PLAYGROUNDS].filter(([name]) => name.toLowerCase().includes(term));

  return CATEGORIES.map((category) => ({
    category,
    names: matches.flatMap(([name, playground]) =>
      playground.category === category ? [name] : [],
    ),
  })).filter((group) => group.names.length > 0);
});

watch(groups, async () => {
  await nextTick();
  syncFades();
});

const selected = computed(() => (PLAYGROUNDS.has(route.value) ? route.value : "Button"));

const playground = computed(() => PLAYGROUNDS.get(selected.value));
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="sidebar__head">
        <a class="brand" href="#/">sarpbc.org <span>design</span></a>
        <div class="search">
          <SInput
            ref="search"
            v-model="query"
            type="search"
            icon="i-lucide-search"
            placeholder="Filter components"
            aria-label="Filter components"
            aria-keyshortcuts="Meta+K Control+K"
          />
          <span class="search__keys" aria-hidden="true">
            <SKbd value="meta" size="sm" />
            <SKbd value="K" size="sm" />
          </span>
        </div>
      </div>
      <div
        class="sidebar__list"
        :data-more-above="moreAbove || undefined"
        :data-more-below="moreBelow || undefined"
      >
        <nav ref="nav" class="sidebar__nav" aria-label="Components" @scroll="syncFades">
          <section v-for="group in groups" :key="group.category" class="nav-group">
            <h2>{{ group.category }}</h2>
            <a
              v-for="name in group.names"
              :key="name"
              :href="`#/${name}`"
              :aria-current="name === selected ? 'page' : undefined"
            >
              {{ name }}
            </a>
          </section>
        </nav>
      </div>
      <SRadioGroup
        v-model="colorMode"
        class="sidebar__foot"
        :items="COLOR_MODES"
        orientation="horizontal"
        aria-label="Color mode"
      />
    </aside>
    <main class="main">
      <header class="page-header">
        <h1>{{ selected }}</h1>
        <p v-if="playground" class="description">
          <template v-for="(part, index) in playground.description.split('`')" :key="index">
            <code v-if="index % 2 === 1">{{ part }}</code>
            <template v-else>{{ part }}</template>
          </template>
        </p>
      </header>
      <PlaygroundPanel
        v-if="playground"
        :key="selected"
        :component="selected"
        :playground="playground"
      />
    </main>
  </div>
</template>
