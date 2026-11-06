import { addComponentsDir, createResolver, defineNuxtModule, hasNuxtModule } from "@nuxt/kit";

const REQUIRED_MODULES = ["@nuxt/ui", "@nuxtjs/i18n", "@sarpbc/composables"];

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

    const { resolve } = createResolver(import.meta.url);
    addComponentsDir({
      path: resolve("./runtime/components-mdc"),
      pathPrefix: false,
      prefix: "Sarp",
      global: true,
    });

    // Host apps that show news tags link to the public site when this is set; empty keeps routes relative.
    nuxt.options.runtimeConfig.public.publicSiteUrl ||= "";

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
