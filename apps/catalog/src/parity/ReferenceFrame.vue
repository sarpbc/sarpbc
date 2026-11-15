<script setup lang="ts">
import { onMounted, useTemplateRef, watchEffect } from "vue";

const { css, dark, html } = defineProps<{ css: string; dark: boolean; html: string }>();

const host = useTemplateRef("host");

const PROPERTY_RULE = /@property[^{]+\{[^}]*\}/gu;

/*
 * Browsers ignore @property inside shadow roots, and Tailwind v4 relies on it
 * for the initial values of its --tw-* variables (rings, shadows). Register
 * them once on the document so the reference renders like production.
 */
const registerProperties = (stylesheet: string): void => {
  const rules = stylesheet.match(PROPERTY_RULE) ?? [];

  if (rules.length === 0 || document.querySelector("style[data-reference-properties]") !== null) {
    return;
  }

  const style = document.createElement("style");

  style.dataset.referenceProperties = "";
  style.textContent = rules.join("\n");
  document.head.append(style);
};

/*
 * Renders Nuxt UI markup with the app's compiled Tailwind CSS inside a shadow
 * root, so its preflight and utilities never reach the catalog or our components.
 */
onMounted(() => {
  registerProperties(css);

  const root = host.value?.attachShadow({ mode: "open" });

  watchEffect(() => {
    if (root === undefined) {
      return;
    }

    /* App stylesheets declare tokens on `:root`, which a shadow root never matches. */
    root.innerHTML = `<style>${css.replaceAll(":root", ":host")}
.frame { padding: 12px; background: var(--ui-bg); color: var(--ui-text); }</style>
<div class="frame${dark ? " dark" : ""}">${html}</div>`;
  });
});
</script>

<template>
  <div ref="host" />
</template>
