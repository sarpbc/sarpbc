<script setup lang="ts">
import { computed, reactive } from "vue";

import { callOf } from "../parity/call.ts";
import { SAMPLE_ICON } from "../parity/playground.ts";

import type { MigratedProp, MigratedProps, ParityCase } from "../parity/cases.ts";
import type { Control, Playground } from "../parity/playground.ts";

const { parity, playground } = defineProps<{ parity: ParityCase; playground: Playground }>();

const values = reactive(
  new Map<string, string | boolean>(
    playground.controls.map((control) => [control.name, control.initial]),
  ),
);

const reset = (): void => {
  for (const control of playground.controls) {
    values.set(control.name, control.initial);
  }
};

/* Only what differs from the component's defaults ends up in the call. */
const propOf = (control: Control): MigratedProp[] => {
  const value = values.get(control.name) ?? control.initial;

  switch (control.kind) {
    case "boolean": {
      return value === true ? [[control.name, true]] : [];
    }

    case "icon": {
      return value === true ? [[control.name, SAMPLE_ICON]] : [];
    }

    case "select": {
      return value === control.initial ? [] : [[control.name, value]];
    }

    case "text": {
      return value === "" ? [] : [[control.name, value]];
    }

    default: {
      return control satisfies never;
    }
  }
};

const props = computed((): MigratedProps => playground.controls.flatMap(propOf));

const preview = computed(() => (playground.render ?? parity.render)(props.value));

const onSelect = (name: string, event: Event): void => {
  if (event.target instanceof HTMLSelectElement) {
    values.set(name, event.target.value);
  }
};

const onText = (name: string, event: Event): void => {
  if (event.target instanceof HTMLInputElement) {
    values.set(name, event.target.value);
  }
};

const onToggle = (name: string, event: Event): void => {
  if (event.target instanceof HTMLInputElement) {
    values.set(name, event.target.checked);
  }
};

const textValue = (name: string): string => {
  const value = values.get(name);

  return value === true || value === false || value === undefined ? "" : value;
};
</script>

<template>
  <section class="playground" aria-label="Playground">
    <div class="playground__stage">
      <component :is="() => preview" />
    </div>
    <form class="playground__controls" @submit.prevent>
      <p v-if="playground.controls.length === 0" class="empty">No props to tune.</p>
      <template v-for="control in playground.controls" :key="control.name">
        <label v-if="control.kind === 'select'" class="control">
          <span>{{ control.name }}</span>
          <select :value="values.get(control.name)" @change="onSelect(control.name, $event)">
            <option v-for="option in control.options" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
        <label v-else-if="control.kind === 'text'" class="control">
          <span>{{ control.name }}</span>
          <input
            type="text"
            :value="textValue(control.name)"
            @input="onText(control.name, $event)"
          />
        </label>
        <label v-else class="control control--toggle">
          <input
            type="checkbox"
            :checked="values.get(control.name) === true"
            @change="onToggle(control.name, $event)"
          />
          <span>{{ control.name }}</span>
        </label>
      </template>
      <button v-if="playground.controls.length > 0" class="mode" type="button" @click="reset">
        Reset
      </button>
    </form>
    <code class="playground__call">{{ callOf(parity.name, props) }}</code>
  </section>
</template>
