<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { z } from "zod";

const STORAGE_KEY = "catalog:ink";
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 850, 900, 950] as const;

const savedSchema = z.object({ chromaDark: z.number(), chromaLight: z.number(), hue: z.number() });

const open = ref(new URLSearchParams(location.search).has("tuner"));
const hue = ref(256);
const chromaLight = ref(0.004);
const chromaDark = ref(0.004);

/** The values tokens.css ships, read once so Reset returns to them. */
const shipped = { chromaDark: 0.004, chromaLight: 0.004, hue: 256 };

const readToken = (name: string): number =>
  Number(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

const save = (): void => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        chromaDark: chromaDark.value,
        chromaLight: chromaLight.value,
        hue: hue.value,
      }),
    );
  } catch {
    /* Storage can be unavailable (private mode); tuning still works for the session. */
  }
};

const restore = (): void => {
  try {
    const saved = savedSchema.safeParse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));

    if (saved.success) {
      ({
        chromaDark: chromaDark.value,
        chromaLight: chromaLight.value,
        hue: hue.value,
      } = saved.data);
    }
  } catch {
    /* Ignore unreadable storage and keep the shipped values. */
  }
};

onMounted(() => {
  shipped.hue = readToken("--sb-ink-hue");
  shipped.chromaLight = readToken("--sb-ink-chroma-light");
  shipped.chromaDark = readToken("--sb-ink-chroma-dark");
  hue.value = shipped.hue;
  chromaLight.value = shipped.chromaLight;
  chromaDark.value = shipped.chromaDark;
  restore();
});

watch([hue, chromaLight, chromaDark], () => {
  const root = document.documentElement.style;

  root.setProperty("--sb-ink-hue", String(hue.value));
  root.setProperty("--sb-ink-chroma-light", String(chromaLight.value));
  root.setProperty("--sb-ink-chroma-dark", String(chromaDark.value));
  save();
});

const reset = (): void => {
  hue.value = shipped.hue;
  chromaLight.value = shipped.chromaLight;
  chromaDark.value = shipped.chromaDark;
};

const snippet = computed(
  () => `--sb-ink-hue: ${hue.value};
--sb-ink-chroma-light: ${chromaLight.value};
--sb-ink-chroma-dark: ${chromaDark.value};`,
);

const copied = ref(false);

const copy = async (): Promise<void> => {
  await navigator.clipboard.writeText(snippet.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1500);
};
</script>

<template>
  <div class="tuner">
    <section v-if="open" class="tuner__panel" aria-label="Neutral palette">
      <header class="tuner__header">
        <strong>Neutrals</strong>
        <button class="mode" type="button" @click="reset">Reset</button>
      </header>

      <label class="control">
        <span>Hue · {{ hue }}°</span>
        <input v-model.number="hue" type="range" min="0" max="360" step="1" />
      </label>
      <label class="control">
        <span>Chroma, light steps 50–400 · {{ chromaLight.toFixed(3) }}</span>
        <input v-model.number="chromaLight" type="range" min="0" max="0.03" step="0.001" />
      </label>
      <label class="control">
        <span>Chroma, dark steps 500–950 · {{ chromaDark.toFixed(3) }}</span>
        <input v-model.number="chromaDark" type="range" min="0" max="0.03" step="0.001" />
      </label>

      <div class="tuner__swatches" aria-hidden="true">
        <span
          v-for="step in STEPS"
          :key="step"
          :title="`ink-${step}`"
          :style="{ background: `var(--sb-ink-${step})` }"
        />
      </div>

      <pre class="tuner__snippet">{{ snippet }}</pre>
      <button class="mode" type="button" @click="copy">
        {{ copied ? "Copied" : "Copy for tokens.css" }}
      </button>
    </section>

    <button class="tuner__toggle" type="button" :aria-expanded="open" @click="open = !open">
      Neutrals
    </button>
  </div>
</template>
