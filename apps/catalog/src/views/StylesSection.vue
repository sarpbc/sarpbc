<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import type { ComponentStyles } from "../styles/types.ts";

const { name } = defineProps<{ name: string }>();

const COLOR_VALUE = /^(?:oklch|oklab|lab|lch|rgb|hsl|color-mix|#)/u;
const DERIVED_PROPS = new Set(["leading", "square", "trailing"]);

const styles = ref<ComponentStyles[] | null>(null);
const failure = ref<string | null>(null);

onMounted(async () => {
  try {
    const module = await import("virtual:nuxt-ui-styles");

    styles.value = module.default.components;
  } catch (error) {
    failure.value = error instanceof Error ? error.message : String(error);
  }
});

const entries = computed(() => styles.value?.filter((entry) => entry.component === name) ?? []);
</script>

<template>
  <section>
    <h2>Production styles</h2>
    <p v-if="failure !== null" class="empty">Could not resolve styles: {{ failure }}</p>
    <p v-else-if="styles === null" class="empty">Resolving Nuxt UI themes and Tailwind CSS…</p>
    <p v-else-if="entries.length === 0" class="empty">
      This component has no Nuxt UI theme, so it renders no styles of its own.
    </p>

    <article v-for="entry in entries" :key="entry.app" class="styles-app">
      <header class="styles-app__header">
        <h3>{{ entry.app }}</h3>
        <span class="muted">
          {{ entry.variants.length }} distinct looks · <code>{{ entry.theme }}</code>
          <template v-if="entry.overridden">
            · extended by <code>apps/{{ entry.app }}/app/app.config.ts</code></template
          >
        </span>
      </header>

      <h4>Looks in use</h4>
      <ol class="looks">
        <li v-for="(look, index) in entry.variants" :key="index" class="look">
          <div class="look__meta">
            <span class="strong">{{ look.count }}×</span>
            <ul class="chips">
              <li v-if="look.props.length === 0"><code>defaults</code></li>
              <li
                v-for="prop in look.props"
                :key="prop.name"
                :class="{ derived: DERIVED_PROPS.has(prop.name) }"
              >
                <code>{{ prop.name }}={{ prop.value }}</code>
              </li>
            </ul>
            <span v-if="look.dynamic.length > 0" class="muted">
              bound at runtime: {{ look.dynamic.join(", ") }}
            </span>
          </div>
          <dl class="look__slots">
            <template v-for="slot in look.slots" :key="slot.slot">
              <div v-if="slot.classes !== ''">
                <dt>{{ slot.slot }}</dt>
                <dd><code>{{ slot.classes }}</code></dd>
              </div>
            </template>
          </dl>
        </li>
      </ol>

      <details>
        <summary>
          <h4>CSS for {{ entry.rules.length }} classes</h4>
        </summary>
        <dl class="rules">
          <div v-for="rule in entry.rules" :key="rule.className">
            <dt><code>{{ rule.className }}</code></dt>
            <dd><pre>{{ rule.css }}</pre></dd>
          </div>
        </dl>
      </details>

      <h4>Tokens</h4>
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Variable</th>
            <th scope="col">Light</th>
            <th scope="col">Dark</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="token in entry.tokens" :key="token.name">
            <th scope="row"><code>{{ token.name }}</code></th>
            <td v-for="value in [token.light, token.dark]" :key="value">
              <span class="token-value">
                <span
                  v-if="COLOR_VALUE.test(value)"
                  class="swatch"
                  :style="{ background: value }"
                />
                <code>{{ value || "set inline at runtime" }}</code>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>
