import { addImportsDir, createResolver, defineNuxtModule } from "@nuxt/kit";

export default defineNuxtModule({
  meta: {
    name: "@sarpbc/composables",
    configKey: "sarpbcComposables",
  },
  setup() {
    const { resolve } = createResolver(import.meta.url);
    addImportsDir(resolve("./runtime/composables"));
  },
});
