import { addImportsDir, createResolver, defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    configKey: "sarpbcComposables",
    name: "@sarpbc/composables",
  },
  setup() {
    const resolver = createResolver(import.meta.url);
    addImportsDir(resolver.resolve("./runtime/composables"));
  },
});
