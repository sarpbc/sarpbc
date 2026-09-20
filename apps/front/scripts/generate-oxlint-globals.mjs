#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT_ROOT = path.resolve(__dirname, "..");
const IMPORTS_TYPES = path.join(FRONT_ROOT, ".nuxt/types/imports.d.ts");
const OUTPUT = path.join(FRONT_ROOT, ".oxlintrc.globals.json");

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
  let source;
  try {
    source = readFileSync(IMPORTS_TYPES, "utf8");
  } catch {
    console.error(`Missing ${IMPORTS_TYPES}. Run "pnpm exec nuxt prepare" in apps/front first.`);
    process.exit(1);
  }

  return [...source.matchAll(/^\s*const (\$?\w+):/gm)].map((match) => match[1]);
}

const globals = Object.fromEntries(
  [...new Set([...readAutoImportNames(), ...VUE_MACROS, ...BROWSER_GLOBALS])]
    .sort()
    .map((name) => [name, "readonly"]),
);

writeFileSync(OUTPUT, `${JSON.stringify({ globals }, null, 2)}\n`);
