import { existsSync, readFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import path from "node:path";

import { __unstable__loadDesignSystem, compile } from "@tailwindcss/node";
import { parse } from "postcss";
import { createTV } from "tailwind-variants";
import tailwindColors from "tailwindcss/colors";
import { z } from "zod";

import { STYLED_APPS } from "./types.ts";

import type { ComponentUsage, Inventory, Recipe, StaticProp } from "../inventory/types.ts";
import type {
  AppStylesheet,
  ClassRule,
  ComponentStyles,
  NuxtUiStyles,
  SlotClasses,
  StyledApp,
  StyleVariant,
  TokenValue,
} from "./types.ts";

/*
 * Reproduces what Nuxt UI renders in production: each component's generated
 * theme (`.nuxt/ui/<name>.ts`) extended by the app's `app.config.ts`, resolved
 * through tailwind-variants like `@nuxt/ui/runtime/utils/tv`, then compiled to
 * CSS by Tailwind with the app's own stylesheet.
 */

const classValueSchema = z.union([z.string(), z.array(z.string())]);

/* tailwind-variants keys boolean variants as "true" / "false". */
const variantKeySchema = z.union([z.string(), z.boolean().transform(String)]);

const variantConditionSchema = z.union([variantKeySchema, z.array(z.string())]);

const slotClassesSchema = z.record(z.string(), classValueSchema);

const variantClassesSchema = z.union([classValueSchema, slotClassesSchema]);

const compoundVariantSchema = z
  .object({ class: variantClassesSchema.optional() })
  .catchall(variantConditionSchema);

/* Generated Nuxt UI themes and `appConfig.ui.<component>` overrides share this shape. */
const themeSchema = z.object({
  base: classValueSchema.optional(),
  compoundVariants: z.array(compoundVariantSchema).optional(),
  defaultVariants: z.record(z.string(), variantKeySchema).optional(),
  slots: slotClassesSchema.optional(),
  variants: z.record(z.string(), z.record(z.string(), variantClassesSchema)).optional(),
});

type Theme = z.infer<typeof themeSchema>;

const themeModuleSchema = z.object({ default: themeSchema });

const appConfigModuleSchema = z.object({
  default: z.object({ ui: z.record(z.string(), z.unknown()).optional() }),
});

/* tailwind-variants returns slot functions for slotted themes and a class string (or nothing) otherwise. */
const slottedOutputSchema = z.record(
  z.string(),
  z.function({ input: [], output: z.string().optional() }),
);

const baseOutputSchema = z.string().optional();

const tv = createTV({});

const SOURCE_DIRECTIVE = /@source[^;]*;/gu;
const PROPERTY_RULE = /@property[^{]+\{[^}]*\}\s*/gu;
const VARIABLE_REFERENCE = /var\((?<name>--[\w-]+)/gu;
const LIGHT_SELECTOR = /:root|:host|\.light/u;
const LEADING_PROPS: ReadonlySet<string> = new Set(["avatar", "icon", "leadingIcon"]);
const TRAILING_PROPS: ReadonlySet<string> = new Set(["trailingIcon"]);
const LABEL_PROPS: ReadonlySet<string> = new Set(["label"]);

interface AppStyles {
  components: ComponentStyles[];
  stylesheet: AppStylesheet;
}

interface CustomProperties {
  dark: ReadonlyMap<string, string>;
  light: ReadonlyMap<string, string>;
}

interface AppContext {
  app: StyledApp;
  build: (classes: string[]) => string;
  overrides: ReadonlyMap<string, Theme>;
  toCss: (classes: string[]) => (string | null)[];
}

const posix = (file: string): string => file.replaceAll("\\", "/");

/** `UFormField` → `formField`, the key Nuxt UI reads in `appConfig.ui`. */
const configKey = (name: string): string => name.charAt(1).toLowerCase() + name.slice(2);

const kebab = (name: string): string =>
  name
    .replace(/^U/u, "")
    .replaceAll(/(?<!^)(?<upper>[A-Z])/gu, "-$<upper>")
    .toLowerCase();

const importModule = async <Module>(code: string, schema: z.ZodType<Module>): Promise<Module> => {
  const module: unknown = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );

  return schema.parse(module);
};

/* Nuxt UI's defaults when the module sets no `ui.theme.colors`, overridden by `appConfig.ui.colors`. */
const DEFAULT_COLORS = new Map([
  ["error", "red"],
  ["info", "blue"],
  ["neutral", "slate"],
  ["primary", "green"],
  ["secondary", "blue"],
  ["success", "green"],
  ["warning", "yellow"],
]);

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

const shadesSchema = z.record(z.string(), z.string());

const colorsSchema = z.record(z.string(), z.string());

/* Tailwind's palette: shade maps per color, plus plain keywords such as `inherit`. */
const PALETTES = new Map(
  Object.entries(z.record(z.string(), z.unknown()).parse(tailwindColors)).flatMap(
    ([name, palette]) => {
      const shades = shadesSchema.safeParse(palette);

      return shades.success ? [[name, new Map(Object.entries(shades.data))] as const] : [];
    },
  ),
);

/**
 * The `@layer theme` block Nuxt UI's colors plugin injects at runtime
 * (`@nuxt/ui/runtime/plugins/colors`): semantic colors map to palette shades,
 * 500 in light and 400 in dark.
 */
const colorLayer = (colors: ReadonlyMap<string, string>): string => {
  const entries = [...colors];

  const shades = entries.flatMap(([key, value]) =>
    SHADES.map((shade) => {
      const palette = value === "neutral" ? "old-neutral" : value;

      return `--ui-color-${key}-${shade}: var(--color-${palette}-${shade}, ${PALETTES.get(value)?.get(String(shade)) ?? ""});`;
    }),
  );

  const semantic = (shade: number): string =>
    entries
      .flatMap(([key]) =>
        key === "neutral" ? [] : [`--ui-${key}: var(--ui-color-${key}-${shade});`],
      )
      .join(" ");

  return `@layer theme {
:root, :host { ${shades.join(" ")} }
:root, :host, .light { ${semantic(500)} }
.dark { ${semantic(400)} }
}`;
};

const appStylesheet = (
  root: string,
  app: StyledApp,
  colors: ReadonlyMap<string, string>,
): string => {
  const runtime = path.join(root, "apps", app, "node_modules/@nuxt/ui/dist/runtime");

  const tailwind = createRequire(path.join(root, "apps/catalog/package.json")).resolve(
    "tailwindcss/index.css",
  );

  const nuxtUi = readFileSync(path.join(runtime, "index.css"), "utf-8")
    .replace('"#build/ui.css"', JSON.stringify(posix(path.join(root, "apps", app, ".nuxt/ui.css"))))
    .replace('"./keyframes.css"', JSON.stringify(posix(path.join(runtime, "keyframes.css"))));

  const stylesheet = readFileSync(path.join(root, "apps", app, "app/assets/css/main.css"), "utf-8")
    .replace('@import "@nuxt/ui";', nuxtUi)
    .replace('@import "tailwindcss";', `@import ${JSON.stringify(posix(tailwind))};`)
    .replaceAll(SOURCE_DIRECTIVE, "");

  return `${stylesheet}
${colorLayer(colors)}`;
};

/** Splits custom properties by color mode: `.dark` rules versus `:root` / `.light` / `:host`. */
const readCustomProperties = (css: string): CustomProperties => {
  const light = new Map<string, string>();
  const dark = new Map<string, string>();

  parse(css).walkRules((rule) => {
    const isDark = rule.selector.includes(".dark");

    if (!isDark && !LIGHT_SELECTOR.test(rule.selector)) {
      return;
    }

    rule.each((node) => {
      if (node.type === "decl" && node.prop.startsWith("--")) {
        (isDark ? dark : light).set(node.prop, node.value);
      }
    });
  });

  return { dark, light };
};

const loadAppContext = async (root: string, app: StyledApp): Promise<AppContext> => {
  const appConfigSource = stripTypeScriptTypes(
    readFileSync(path.join(root, "apps", app, "app/app.config.ts"), "utf-8"),
  ).replace("defineAppConfig(", "(");

  const appConfig = await importModule(appConfigSource, appConfigModuleSchema);
  const appColors = colorsSchema.safeParse(appConfig.default.ui?.colors);
  const colors = new Map(DEFAULT_COLORS);

  if (appColors.success) {
    for (const [key, value] of Object.entries(appColors.data)) {
      colors.set(key, value);
    }
  }

  const css = appStylesheet(root, app, colors);

  const base = path.join(root, "apps", app, "app/assets/css");

  const dependencies = new Set<string>();

  const [designSystem, compiler] = await Promise.all([
    __unstable__loadDesignSystem(css, { base }),
    compile(css, {
      base,
      onDependency: (file) => {
        dependencies.add(file);
      },
    }),
  ]);

  return {
    app,
    build: (classes) => compiler.build(classes),
    overrides: new Map(
      Object.entries(appConfig.default.ui ?? {}).flatMap(([key, value]) => {
        const theme = themeSchema.safeParse(value);

        return theme.success ? [[key, theme.data] as const] : [];
      }),
    ),
    toCss: (candidates) => designSystem.candidatesToCss(candidates),
  };
};

const loadTheme = async (root: string, file: string): Promise<Theme | null> => {
  const absolute = path.join(root, file);

  if (!existsSync(absolute)) {
    return null;
  }

  const module = await importModule(
    stripTypeScriptTypes(readFileSync(absolute, "utf-8")),
    themeModuleSchema,
  );

  return module.default;
};

const hasProp = (recipe: Recipe, names: ReadonlySet<string>): boolean =>
  recipe.props.some((prop) => names.has(prop.name)) ||
  recipe.dynamic.some((name) => names.has(name));

/**
 * Props tailwind-variants receives. Literal values pass through; `leading`,
 * `trailing` and `square` mirror how Nuxt UI derives them from icons, label and
 * default content.
 */
const variantInput = (recipe: Recipe, variantKeys: ReadonlySet<string>): StaticProp[] => {
  const input = recipe.props.filter((prop) => variantKeys.has(prop.name));
  const derived: StaticProp[] = [];

  if (variantKeys.has("leading") && hasProp(recipe, LEADING_PROPS)) {
    derived.push({ name: "leading", value: "true" });
  }

  if (variantKeys.has("trailing") && hasProp(recipe, TRAILING_PROPS)) {
    derived.push({ name: "trailing", value: "true" });
  }

  if (
    variantKeys.has("square") &&
    !recipe.content &&
    !hasProp(recipe, LABEL_PROPS) &&
    !input.some((prop) => prop.name === "square")
  ) {
    derived.push({ name: "square", value: "true" });
  }

  return [...input, ...derived];
};

const renderSlots = (
  theme: Theme,
  override: Theme | undefined,
  props: readonly StaticProp[],
): SlotClasses[] => {
  /*
   * Vue boolean props default to `false`, not `undefined`, and Nuxt UI passes
   * them through; compound variants such as input's `fixed: false` depend on it.
   */
  const booleanDefaults = Object.entries(theme.variants ?? {}).flatMap(([name, values]) =>
    Object.keys(values).every((value) => value === "true" || value === "false")
      ? [[name, "false"] as const]
      : [],
  );

  const output: unknown = tv({ extend: tv(theme), ...override })(
    Object.fromEntries([
      ...booleanDefaults,
      ...props.map((prop) => [prop.name, prop.value] as const),
    ]),
  );

  const slotted = slottedOutputSchema.safeParse(output);

  if (!slotted.success) {
    return [{ classes: baseOutputSchema.parse(output) ?? "", slot: "base" }];
  }

  return Object.entries(slotted.data).map(([slot, classes]) => ({
    classes: classes() ?? "",
    slot,
  }));
};

const resolveVariables = (
  value: string,
  lookup: (name: string) => string | undefined,
  depth = 0,
): string =>
  depth > 8
    ? value
    : value.replaceAll(
        /var\((?<name>--[\w-]+)(?:,\s*(?<fallback>(?:[^()]|\([^()]*\))*))?\)/gu,
        (match, name: string, fallback: string | undefined) => {
          const resolved = lookup(name) ?? fallback;

          return resolved === undefined ? match : resolveVariables(resolved, lookup, depth + 1);
        },
      );

const tokensFor = (rules: readonly ClassRule[], context: CustomProperties): TokenValue[] => {
  const names = new Set(
    rules.flatMap((rule) =>
      [...rule.css.matchAll(VARIABLE_REFERENCE)].map((match) => match.groups?.name ?? ""),
    ),
  );

  return [...names]
    .filter((name) => name !== "" && !name.startsWith("--tw-"))
    .toSorted()
    .map((name) => ({
      dark: resolveVariables(
        context.dark.get(name) ?? context.light.get(name) ?? "",
        (key) => context.dark.get(key) ?? context.light.get(key),
      ),
      light: resolveVariables(context.light.get(name) ?? "", (key) => context.light.get(key)),
      name,
    }));
};

const styleVariants = (
  component: ComponentUsage,
  theme: Theme,
  context: AppContext,
): StyleVariant[] => {
  const variantKeys = new Set(Object.keys(theme.variants ?? {}));
  const looks = new Map<string, StyleVariant>();
  const override = context.overrides.get(configKey(component.name));

  for (const recipe of component.recipes) {
    if ((recipe.source === "admin" ? "admin" : "front") !== context.app) {
      continue;
    }

    const props = variantInput(recipe, variantKeys);
    const slots = renderSlots(theme, override, props);
    const key = JSON.stringify(slots);
    const look = looks.get(key) ?? { count: 0, dynamic: [], props, slots };

    look.count += recipe.count;
    look.dynamic = [
      ...new Set([...look.dynamic, ...recipe.dynamic.filter((name) => variantKeys.has(name))]),
    ].toSorted();
    looks.set(key, look);
  }

  return [...looks.values()].toSorted((left, right) => right.count - left.count);
};

const classesOf = (variants: readonly StyleVariant[]): string[] => [
  ...new Set(
    variants
      .flatMap((variant) => variant.slots.flatMap((slot) => slot.classes.split(/\s+/u)))
      .filter((className) => className !== ""),
  ),
];

const appStyles = (
  inventory: Inventory,
  themes: ReadonlyMap<string, Theme | null>,
  context: AppContext,
): AppStyles => {
  const looks = inventory.components.flatMap((component) => {
    const theme = themes.get(component.name) ?? null;

    return theme === null
      ? []
      : [{ component, variants: styleVariants(component, theme, context) }];
  });

  const classNames = classesOf(looks.flatMap(({ variants }) => variants));
  const compiled = context.toCss(classNames);
  const cssByClass = new Map(classNames.map((className, index) => [className, compiled[index]]));
  const css = context.build(classNames);
  const customProperties = readCustomProperties(css);

  const components = looks.flatMap(({ component, variants }): ComponentStyles[] => {
    if (variants.length === 0) {
      return [];
    }

    const rules = classesOf(variants).flatMap((className): ClassRule[] => {
      const rule = cssByClass.get(className)?.replaceAll(PROPERTY_RULE, "").trim() ?? "";

      return rule === "" ? [] : [{ className, css: rule }];
    });

    return [
      {
        app: context.app,
        component: component.name,
        overridden: context.overrides.has(configKey(component.name)),
        rules,
        theme: `apps/front/.nuxt/ui/${kebab(component.name)}.ts`,
        tokens: tokensFor(rules, customProperties),
        variants,
      },
    ];
  });

  return { components, stylesheet: { app: context.app, css } };
};

export const resolveNuxtUiStyles = async (
  root: string,
  inventory: Inventory,
): Promise<NuxtUiStyles> => {
  const [themes, contexts] = await Promise.all([
    Promise.all(
      inventory.components.map(
        async (component) =>
          [
            component.name,
            await loadTheme(root, `apps/front/.nuxt/ui/${kebab(component.name)}.ts`),
          ] as const,
      ),
    ),
    Promise.all(STYLED_APPS.map(async (app) => await loadAppContext(root, app))),
  ]);

  const themeByComponent = new Map(themes);

  const perApp = contexts.map((context) => appStyles(inventory, themeByComponent, context));

  return {
    components: perApp.flatMap((entry) => entry.components),
    stylesheets: perApp.map((entry) => entry.stylesheet),
  };
};
