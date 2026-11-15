import { createRequire } from "node:module";
import path from "node:path";

import {
  addComponentsDir,
  addImports,
  addPluginTemplate,
  createResolver,
  defineNuxtModule,
  hasNuxtModule,
} from "@nuxt/kit";

const REQUIRED_MODULES = ["@nuxtjs/i18n", "@sarpbc/composables"];

export default defineNuxtModule({
  meta: {
    name: "@sarpbc/ui",
  },
  setup(_options, nuxt) {
    for (const name of REQUIRED_MODULES) {
      if (!hasNuxtModule(name, nuxt)) {
        throw new Error(`@sarpbc/ui requires the ${name} module.`);
      }
    }

    const resolver = createResolver(import.meta.url);

    // @sarpbc/design: its components as `Sb*`, its tokens, and Nuxt's <Icon> and <NuxtLink> as its adapters.
    const { resolve } = createRequire(import.meta.url);
    // Generated imports need forward slashes, including on Windows.
    const design = resolve("@sarpbc/design").replaceAll("\\", "/");
    nuxt.options.css.unshift(resolve("@sarpbc/design/tokens.css"));
    nuxt.options.css.push(resolver.resolve("./runtime/prose.css"));
    // Overlays render at the end of <body>; isolating the app keeps its z-indexes below them.
    nuxt.options.app.rootAttrs.class = [nuxt.options.app.rootAttrs.class, "isolate"]
      .filter(Boolean)
      .join(" ");
    /*
     * Design styles sit in the `components` layer, so Tailwind utilities passed by
     * the apps still win. Nuxt inlines component styles and Nuxt UI's colors
     * before the entry stylesheet, which would declare `components` before `base`
     * and let preflight override them: fix the order first thing in <head>.
     */
    nuxt.options.app.head.style ??= [];
    nuxt.options.app.head.style.unshift({
      innerHTML: "@layer theme, base, components, utilities;",
      tagPriority: "critical",
    });
    addComponentsDir({ path: path.join(path.dirname(design), "components"), prefix: "Sb" });
    addImports({ from: design, name: "useToast", priority: 1 });
    addPluginTemplate({
      filename: "sarpbc-design.mjs",
      getContents: () => `import { defineNuxtPlugin } from "#app";
import { Icon, NuxtLink } from "#components";
import { DESIGN_ADAPTERS } from ${JSON.stringify(design)};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.provide(DESIGN_ADAPTERS, {
    icon: Icon,
    link: NuxtLink,
    translate: (message) => nuxtApp.$i18n.t(\`design.\${message}\`),
  });
});
`,
    });

    addComponentsDir({
      global: true,
      path: resolver.resolve("./runtime/components-mdc"),
      pathPrefix: false,
      prefix: "Sarp",
    });

    // Host apps that show news tags link to the public site when this is set; empty keeps routes relative.
    addImports({
      from: resolver.resolve("./runtime/composables/use-match-state-label"),
      name: "useMatchStateLabel",
    });

    nuxt.options.runtimeConfig.public.publicSiteUrl ??= "";

    // @nuxtjs/i18n calls this hook while it sets up, so list this module before it.
    nuxt.hook("i18n:registerModule", (register) => {
      register({
        langDir: resolver.resolve("./runtime/locales"),
        locales: [
          { code: "en", file: "en-US.json" },
          { code: "fr", file: "fr-FR.json" },
        ],
      });
    });
  },
});
