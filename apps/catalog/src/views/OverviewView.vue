<script setup lang="ts">
import { computed } from "vue";

import { CATEGORIES, categoryOf, countIn, inventory } from "../catalog.ts";
import { SCANNED_SOURCES } from "../inventory/types.ts";

const usages = inventory.components.reduce((sum, component) => sum + component.total, 0);

const groups = computed(() =>
  CATEGORIES.map((category) => ({
    category,
    components: inventory.components.filter((component) => categoryOf(component) === category),
  })).filter((group) => group.components.length > 0),
);
</script>

<template>
  <header class="page-header">
    <p class="eyebrow">Nuxt UI inventory</p>
    <h1>Components to replace</h1>
    <p class="lede">
      Every Nuxt UI component, composable and type the apps use today, scanned from source on each
      load. Open a component to see which props, values and slots we actually rely on: that is the
      API the replacement needs.
    </p>
  </header>

  <dl class="stats">
    <div>
      <dt>Components</dt>
      <dd>{{ inventory.components.length }}</dd>
    </div>
    <div>
      <dt>Usages</dt>
      <dd>{{ usages }}</dd>
    </div>
    <div>
      <dt>Composables</dt>
      <dd>{{ inventory.composables.length }}</dd>
    </div>
    <div>
      <dt>Types</dt>
      <dd>{{ inventory.types.length }}</dd>
    </div>
  </dl>

  <table class="table">
    <thead>
      <tr>
        <th scope="col">Component</th>
        <th v-for="source in SCANNED_SOURCES" :key="source" scope="col" class="numeric">
          {{ source }}
        </th>
        <th scope="col" class="numeric">Total</th>
        <th scope="col" class="numeric">Props</th>
      </tr>
    </thead>
    <tbody v-for="group in groups" :key="group.category">
      <tr class="group-row">
        <th :colspan="SCANNED_SOURCES.length + 3" scope="rowgroup">{{ group.category }}</th>
      </tr>
      <tr v-for="component in group.components" :key="component.name">
        <th scope="row">
          <a :href="`#/${component.name}`">{{ component.name }}</a>
        </th>
        <td
          v-for="source in SCANNED_SOURCES"
          :key="source"
          class="numeric"
          :class="{ muted: countIn(component, source) === 0 }"
        >
          {{ countIn(component, source) }}
        </td>
        <td class="numeric strong">{{ component.total }}</td>
        <td class="numeric">{{ component.props.length }}</td>
      </tr>
    </tbody>
  </table>

  <div class="columns">
    <section
      v-for="list in [
        { title: 'Composables', items: inventory.composables },
        { title: 'Types', items: inventory.types },
      ]"
      :key="list.title"
    >
      <h2>{{ list.title }}</h2>
      <ul class="symbol-list">
        <li v-for="symbol in list.items" :key="symbol.name">
          <details>
            <summary>
              <code>{{ symbol.name }}</code>
              <span class="count">{{ symbol.total }}</span>
            </summary>
            <ul class="file-list">
              <li v-for="file in symbol.files" :key="file.path">
                <code>{{ file.path }}</code>
                <span class="count">{{ file.count }}</span>
              </li>
            </ul>
          </details>
        </li>
      </ul>
    </section>
  </div>
</template>
