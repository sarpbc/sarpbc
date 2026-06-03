import globals from "globals";
import { createConfigForNuxt } from "@nuxt/eslint-config";

const nuxtEslintConfig = await createConfigForNuxt({
  features: {
    typescript: true,
    stylistic: false,
  },
});

export default [
  {
    ignores: ["node_modules/", "dist/", ".nuxt/", ".output/"],
  },

  ...nuxtEslintConfig,

  {
    files: ["**/*.ts", "**/*.vue"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "vue/html-self-closing": [
        "off",
        {
          html: {
            void: "never",
            normal: "never",
            component: "never",
          },
          svg: "never",
          math: "never",
        },
      ],
    },
  },
];
