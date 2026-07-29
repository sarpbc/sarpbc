import { addComponentsDir, createResolver, defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "@sarpbc/ui",
    configKey: "sarpbcUi",
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);
    addComponentsDir({
      path: resolve("./runtime/components"),
      pathPrefix: false,
      prefix: "Sarp",
    });
    addComponentsDir({
      path: resolve("./runtime/components-mdc"),
      pathPrefix: false,
      prefix: "Sarp",
      global: true,
    });
  },
});
