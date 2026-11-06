import { addComponentsDir, createResolver, defineNuxtModule, hasNuxtModule } from "@nuxt/kit";

export interface ModuleOptions {
  /** When set, news entity tags link to this site in a new tab instead of the host app's own routes. */
  entityTagSiteUrl: string;
}

const REQUIRED_MODULES = ["@nuxt/ui", "@nuxtjs/i18n"];

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@sarpbc/ui",
    configKey: "sarpbcUi",
  },
  defaults: {
    entityTagSiteUrl: "",
  },
  setup(options, nuxt) {
    for (const name of REQUIRED_MODULES) {
      if (!hasNuxtModule(name, nuxt)) {
        throw new Error(`@sarpbc/ui requires the ${name} module.`);
      }
    }

    const { resolve } = createResolver(import.meta.url);
    addComponentsDir({
      path: resolve("./runtime/components-mdc"),
      pathPrefix: false,
      prefix: "Sarp",
      global: true,
    });

    nuxt.options.runtimeConfig.public.sarpbcUi = options;

    // @nuxtjs/i18n calls this hook while it sets up, so list this module before it.
    nuxt.hook("i18n:registerModule", (register) => {
      register({
        langDir: resolve("./runtime/locales"),
        locales: [
          { code: "en", file: "en-US.json" },
          { code: "fr", file: "fr-FR.json" },
        ],
      });
    });
  },
});
