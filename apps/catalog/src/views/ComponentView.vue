<script setup lang="ts">
import { categoryOf, countIn, docsUrl } from "../catalog.ts";
import { SCANNED_SOURCES } from "../inventory/types.ts";

import type { ComponentUsage } from "../inventory/types.ts";

import StylesSection from "./StylesSection.vue";

const { component } = defineProps<{ component: ComponentUsage }>();

const VISIBLE_VALUES = 12;
</script>

<template>
  <header class="page-header">
    <p class="eyebrow">{{ categoryOf(component) }}</p>
    <h1>{{ component.name }}</h1>
    <p class="lede">
      Used {{ component.total }} times in {{ component.files.length }} files.
      <a :href="docsUrl(component.name)" target="_blank" rel="noreferrer">Nuxt UI documentation</a>
    </p>
  </header>

  <dl class="stats">
    <div v-for="source in SCANNED_SOURCES" :key="source">
      <dt>{{ source }}</dt>
      <dd>{{ countIn(component, source) }}</dd>
    </div>
    <div>
      <dt>Distinct props</dt>
      <dd>{{ component.props.length }}</dd>
    </div>
  </dl>

  <section>
    <h2>Props</h2>
    <p v-if="component.props.length === 0" class="empty">No props are passed.</p>
    <table v-else class="table">
      <thead>
        <tr>
          <th scope="col">Prop</th>
          <th scope="col" class="numeric">Uses</th>
          <th scope="col" class="numeric">Bound</th>
          <th scope="col">Static values</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="prop in component.props" :key="prop.name">
          <th scope="row"><code>{{ prop.name }}</code></th>
          <td class="numeric strong">{{ prop.total }}</td>
          <td class="numeric" :class="{ muted: prop.dynamic === 0 }">{{ prop.dynamic }}</td>
          <td>
            <ul class="chips">
              <li v-for="value in prop.values.slice(0, VISIBLE_VALUES)" :key="value.key">
                <code>{{ value.key }}</code>
                <span class="count">{{ value.count }}</span>
              </li>
              <li v-if="prop.values.length > VISIBLE_VALUES" class="more">
                +{{ prop.values.length - VISIBLE_VALUES }}
              </li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <div class="columns">
    <section
      v-for="list in [
        { title: 'Slots', items: component.slots },
        { title: 'Events', items: component.events },
      ]"
      :key="list.title"
    >
      <h2>{{ list.title }}</h2>
      <p v-if="list.items.length === 0" class="empty">None used.</p>
      <ul v-else class="chips">
        <li v-for="item in list.items" :key="item.key">
          <code>{{ item.key }}</code>
          <span class="count">{{ item.count }}</span>
        </li>
      </ul>
    </section>
  </div>

  <StylesSection :name="component.name" />

  <section>
    <h2>Files</h2>
    <ul class="file-list">
      <li v-for="file in component.files" :key="file.path">
        <code>{{ file.path }}</code>
        <span class="count">{{ file.count }}</span>
      </li>
    </ul>
  </section>
</template>
