/* The stylesheets load before any component CSS, so their `@layer base, components` order holds. */
import "@sarpbc/design/tokens.css";
import "./styles.css";

import { createApp } from "vue";

import App from "./App.vue";

createApp(App).mount("#app");
