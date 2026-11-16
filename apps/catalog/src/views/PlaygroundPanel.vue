<script setup lang="ts">
import {
  Button as SButton,
  FormField as SFormField,
  Input as SInput,
  InputNumber as SInputNumber,
  Select as SSelect,
  Switch as SSwitch,
  Tabs as STabs,
} from "@sarpbc/design";
import { computed, reactive, ref } from "vue";
import { z } from "zod";

import { callOf } from "../playground/call.ts";
import RenderNode from "./RenderNode.vue";
import { listenerOf, propValue, statesOf } from "../playground/model.ts";

import type { TunedProp } from "../playground/call.ts";
import type {
  Bindings,
  ControlValue,
  ControlValues,
  Emitted,
  ModelValue,
  Playground,
  VariantAxis,
  VariantState,
} from "../playground/model.ts";

const { component, playground } = defineProps<{ component: string; playground: Playground }>();

interface LoggedEvent {
  id: number;
  name: string;
  payload: string;
}

const LOG_SIZE = 30;

const initialValues = (): Record<string, ControlValue> =>
  Object.fromEntries(playground.controls.map((control) => [control.name, control.initial]));

const values = reactive(initialValues());
const models = reactive<Record<string, ModelValue>>({ ...playground.models });
const log = ref<LoggedEvent[]>([]);

const TABS = [
  { label: "Playground", value: "playground" },
  { label: "Variants", value: "variants" },
];

const tab = ref("playground");

let nextId = 0;

const reset = (): void => {
  Object.assign(values, initialValues());
  Object.assign(models, playground.models);
};

const formatOne = (payload: Emitted): string => {
  if (payload instanceof Event) {
    return `${payload.constructor.name} (${payload.type})`;
  }

  return JSON.stringify(payload) ?? "";
};

const format = (payload: readonly Emitted[]): string => {
  const text = payload.map(formatOne).join(", ");

  return text.length > 100 ? `${text.slice(0, 99)}…` : text;
};

const record = (name: string, payload: readonly Emitted[]): void => {
  nextId += 1;
  log.value = [{ id: nextId, name, payload: format(payload) }, ...log.value].slice(0, LOG_SIZE);
};

const modelNames = Object.keys(playground.models ?? {});
const events = playground.events ?? [];

const tunedOf = (current: ControlValues, demo: boolean): TunedProp[] =>
  playground.controls.flatMap((control): TunedProp[] => {
    const value = propValue(control, current[control.name] ?? null);

    return value === null || (control.demo === true) !== demo ? [] : [[control, value]];
  });

const recordOf = (tuned: readonly TunedProp[]): ControlValues =>
  Object.fromEntries(tuned.map(([control, value]) => [control.name, value]));

const propsOf = (current: ControlValues): ControlValues => recordOf(tunedOf(current, false));

const sampleOf = (current: ControlValues): ControlValues => recordOf(tunedOf(current, true));

const bindingsOf = (current: ControlValues): Bindings => ({
  ...propsOf(current),
  ...Object.fromEntries(
    modelNames.flatMap((name) => [
      [name, models[name] ?? null],
      [
        listenerOf(`update:${name}`),
        (next: ModelValue) => {
          models[name] = next;
          record(`update:${name}`, [next]);
        },
      ],
    ]),
  ),
  ...Object.fromEntries(
    events.map((name) => [
      listenerOf(name),
      (...payload: readonly Emitted[]) => {
        record(name, payload);
      },
    ]),
  ),
});

const preview = computed(() => playground.render(bindingsOf(values), sampleOf(values)));

const call = computed(() =>
  playground.call === undefined
    ? callOf(`S${component}`, tunedOf(values, false), modelNames, events)
    : playground.call({ ...propsOf(values), ...sampleOf(values) }),
);

const statesFor = (axis: VariantAxis | undefined): readonly VariantState[] => {
  if (axis === undefined) {
    return [{ label: "", values: {} }];
  }

  if (Array.isArray(axis)) {
    return axis;
  }

  const control = playground.controls.find((candidate) => candidate.name === axis);

  return control === undefined ? [] : statesOf(control);
};

const rows = computed(() => statesFor(playground.variants?.rows));
const columns = computed(() => statesFor(playground.variants?.columns));

const cell = (row: VariantState, column: VariantState) => {
  const current = { ...values, ...row.values, ...column.values };

  return playground.render(bindingsOf(current), sampleOf(current));
};

const numberValue = (name: string): number | null =>
  z.number().nullable().catch(null).parse(values[name]);

const textValue = (name: string): string => z.string().catch("").parse(values[name]);
</script>

<template>
  <div class="panel">
    <STabs v-if="playground.variants" v-model="tab" class="tabs" ariaLabel="View" :items="TABS" />
    <section class="playground" aria-label="Playground">
      <div v-if="tab === 'playground'" class="playground__stage">
        <RenderNode :node="preview" />
      </div>
      <div v-else class="playground__stage playground__stage--grid">
        <table class="variants">
          <thead v-if="playground.variants?.columns">
            <tr>
              <th />
              <th v-for="column in columns" :key="column.label" scope="col">{{ column.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.label">
              <th scope="row">{{ row.label }}</th>
              <td v-for="column in columns" :key="column.label">
                <RenderNode :node="cell(row, column)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <form class="playground__controls" @submit.prevent>
        <p v-if="playground.controls.length === 0" class="empty">No props to tune.</p>
        <template v-for="control in playground.controls" :key="control.name">
          <SFormField v-if="control.kind === 'select'" :label="control.name">
            <SSelect
              :model-value="textValue(control.name)"
              :items="control.options.map((option) => ({ label: option, value: option }))"
              @update:model-value="values[control.name] = $event"
            />
          </SFormField>
          <SFormField v-else-if="control.kind === 'text'" :label="control.name">
            <SInput
              :model-value="textValue(control.name)"
              @update:model-value="values[control.name] = $event"
            />
          </SFormField>
          <SFormField v-else-if="control.kind === 'number'" :label="control.name">
            <SInputNumber
              :model-value="numberValue(control.name)"
              :min="control.min ?? null"
              :max="control.max ?? null"
              :grouping="false"
              @update:model-value="values[control.name] = $event"
            />
          </SFormField>
          <SSwitch
            v-else
            :model-value="values[control.name] === true"
            :label="control.name"
            @update:model-value="values[control.name] = $event"
          />
        </template>
        <SButton label="Reset" size="sm" variant="secondary" @click="reset" />
      </form>
      <code class="playground__call">{{ call }}</code>
    </section>
    <section v-if="modelNames.length > 0 || events.length > 0" class="events" aria-label="Events">
      <header class="events__header">
        <h2>Events</h2>
        <SButton
          label="Clear"
          size="sm"
          variant="tertiary"
          :disabled="log.length === 0"
          @click="log = []"
        />
      </header>
      <p v-if="log.length === 0" class="empty">
        Interact with the preview to see
        {{ [...modelNames.map((name) => `update:${name}`), ...events].join(", ") }}.
      </p>
      <ol v-else class="events__list">
        <li v-for="entry in log" :key="entry.id">
          <code class="events__name">{{ entry.name }}</code>
          <code class="events__payload">{{ entry.payload }}</code>
        </li>
      </ol>
    </section>
  </div>
</template>
