import { addImportsDir, addServerImports, createResolver, defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "@sarpbc/composables",
    configKey: "sarpbcComposables",
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);
    const apiBase = resolve("./runtime/composables/apiBase");
    addImportsDir(resolve("./runtime/composables"));
    addServerImports([
      { name: "useApiBase", from: apiBase },
      { name: "useInternalApiHeaders", from: apiBase },
    ]);
  },
});
