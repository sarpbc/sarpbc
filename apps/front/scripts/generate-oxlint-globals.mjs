#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT_ROOT = path.resolve(__dirname, "..");
const IMPORTS_TYPES = [".nuxt/types/imports.d.ts", ".nuxt/types/nitro-imports.d.ts"].map((file) =>
  path.join(FRONT_ROOT, file),
);
const OUTPUT = path.join(FRONT_ROOT, ".oxlintrc.generated.json");

const NODE_AND_NUXT_GLOBALS = ["defineNuxtConfig", "process"];

const VUE_MACROS = [
  "defineEmits",
  "defineExpose",
  "defineModel",
  "defineOptions",
  "defineProps",
  "defineSlots",
  "withDefaults",
];

const BROWSER_GLOBALS = [
  "AbortController",
  "CustomEvent",
  "Element",
  "Event",
  "File",
  "FormData",
  "HTMLElement",
  "KeyboardEvent",
  "MouseEvent",
  "TextDecoder",
  "TextEncoder",
  "URL",
  "URLSearchParams",
  "XMLHttpRequest",
  "alert",
  "atob",
  "btoa",
  "cancelAnimationFrame",
  "clearInterval",
  "clearTimeout",
  "confirm",
  "console",
  "crypto",
  "document",
  "fetch",
  "history",
  "localStorage",
  "location",
  "navigator",
  "performance",
  "queueMicrotask",
  "requestAnimationFrame",
  "sessionStorage",
  "setInterval",
  "setTimeout",
  "structuredClone",
  "window",
];

function readAutoImportNames() {
  return IMPORTS_TYPES.flatMap((file) => {
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      console.error(`Missing ${file}. Run "pnpm exec nuxt prepare" in apps/front first.`);
      process.exit(1);
    }

    return [...source.matchAll(/^\s*const (\$?\w+):/gm)].map((match) => match[1]);
  });
}

const globals = Object.fromEntries(
  [
    ...new Set([
      ...readAutoImportNames(),
      ...VUE_MACROS,
      ...BROWSER_GLOBALS,
      ...NODE_AND_NUXT_GLOBALS,
    ]),
  ]
    .sort()
    .map((name) => [name, "readonly"]),
);

const config = {
  extends: ["../../.oxlintrc.json"],
  globals,
  rules: {
    "no-undef": "error",
  },
};

writeFileSync(OUTPUT, `${JSON.stringify(config, null, 2)}\n`);
