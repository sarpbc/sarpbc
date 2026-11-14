import { addImportsDir, createResolver, defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "@sarpbc/composables",
    configKey: "sarpbcComposables",
  },
  setup() {
    const resolver = createResolver(import.meta.url);
    addImportsDir(resolver.resolve("./runtime/composables"));
  },
});
