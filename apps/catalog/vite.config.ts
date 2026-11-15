import { fileURLToPath } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

import type { Plugin } from "vite";

import { scanNuxtUiUsage, SOURCE_ROOTS } from "./src/inventory/scan.ts";
import { resolveNuxtUiStyles } from "./src/styles/resolve.ts";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const INVENTORY_ID = "virtual:nuxt-ui-inventory";
const STYLES_ID = "virtual:nuxt-ui-styles";
const VIRTUAL_IDS = new Set([INVENTORY_ID, STYLES_ID]);

const nuxtUiInventory = (): Plugin => ({
  configureServer(server) {
    const roots = [
      ...SOURCE_ROOTS.map((root) => `${REPOSITORY_ROOT}${root.dir}`),
      `${REPOSITORY_ROOT}apps/front/.nuxt/ui`,
    ];

    server.watcher.add(roots);
    server.watcher.on("change", (file) => {
      if (!/\.(?:vue|ts|css)$/u.test(file)) {
        return;
      }

      for (const id of VIRTUAL_IDS) {
        const module = server.moduleGraph.getModuleById(`\0${id}`);

        if (module !== undefined) {
          server.moduleGraph.invalidateModule(module);
        }
      }

      server.ws.send({ type: "full-reload" });
    });
  },
  async load(id) {
    switch (id) {
      case `\0${INVENTORY_ID}`: {
        return `export default ${JSON.stringify(scanNuxtUiUsage(REPOSITORY_ROOT))};`;
      }

      case `\0${STYLES_ID}`: {
        const styles = await resolveNuxtUiStyles(REPOSITORY_ROOT, scanNuxtUiUsage(REPOSITORY_ROOT));

        return `export default ${JSON.stringify(styles)};`;
      }

      default: {
        return null;
      }
    }
  },
  name: "sarpbc:nuxt-ui-inventory",
  resolveId(id) {
    return VIRTUAL_IDS.has(id) ? `\0${id}` : null;
  },
});

export default defineConfig({
  plugins: [vue(), nuxtUiInventory()],
});
