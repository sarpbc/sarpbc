import { globSync, readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "vue/compiler-sfc";

import type { SFCTemplateBlock } from "vue/compiler-sfc";

import type {
  ComponentUsage,
  FileUsage,
  Inventory,
  Recipe,
  StaticProp,
  ScannedSource,
  SymbolUsage,
  Tally,
} from "./types.ts";

// The compiler's node types live in @vue/compiler-core; derive them from the SFC block instead of adding that package.
type TemplateChildNode = NonNullable<SFCTemplateBlock["ast"]>["children"][number];

type ElementNode = Extract<TemplateChildNode, { tagType: unknown }>;

type ElementProp = ElementNode["props"][number];

type DirectiveNode = Extract<ElementProp, { modifiers: unknown }>;

type AttributeNode = Exclude<ElementProp, DirectiveNode>;

export const SOURCE_ROOTS: readonly { dir: string; source: ScannedSource }[] = [
  { dir: "apps/front/app", source: "front" },
  { dir: "apps/admin/app", source: "admin" },
  { dir: "packages/ui/src", source: "ui" },
];

const NUXT_UI_COMPOSABLES = [
  "defineShortcuts",
  "extractShortcuts",
  "useColorMode",
  "useFormField",
  "useKbd",
  "useOverlay",
  "useToast",
] as const;

const COMPOSABLE_CALL = new RegExp(String.raw`\b(?<name>${NUXT_UI_COMPOSABLES.join("|")})\(`, "gu");

const NUXT_UI_IMPORT =
  /import\s+(?:type\s+)?\{(?<specifiers>[^}]*)\}\s+from\s+["']@nuxt\/ui(?:\/[^"']*)?["']/gu;

const LITERAL_STRING = /^(?<quote>["'])(?<value>.*)\k<quote>$/u;
const LITERAL_SCALAR = /^(?:true|false|-?\d+(?:\.\d+)?)$/u;
const DYNAMIC = "(dynamic)";

interface PropAccumulator {
  dynamic: number;
  total: number;
  values: Map<string, number>;
}

interface ComponentAccumulator {
  events: Map<string, number>;
  files: Map<string, number>;
  props: Map<string, PropAccumulator>;
  recipes: Map<string, Recipe>;
  slots: Map<string, number>;
  sources: Map<ScannedSource, number>;
}

type CallProps = Pick<Recipe, "dynamic" | "props">;

interface SymbolAccumulator {
  files: Map<string, number>;
}

interface ScriptSymbols {
  composables: Map<string, SymbolAccumulator>;
  types: Map<string, SymbolAccumulator>;
}

interface ScannedFile {
  path: string;
  source: ScannedSource;
}

const increment = <K>(map: Map<K, number>, key: K): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const byCountThenKey = (left: Tally, right: Tally): number =>
  right.count - left.count || left.key.localeCompare(right.key);

const byTotalThenName = (
  left: { name: string; total: number },
  right: { name: string; total: number },
): number => right.total - left.total || left.name.localeCompare(right.name);

const toTallies = (map: ReadonlyMap<string, number>): Tally[] =>
  [...map].map(([key, count]) => ({ count, key })).toSorted(byCountThenKey);

const toFiles = (map: ReadonlyMap<string, number>): FileUsage[] =>
  toTallies(map).map(({ count, key }) => ({ count, path: key }));

const sum = (map: ReadonlyMap<unknown, number>): number =>
  [...map.values()].reduce((total, count) => total + count, 0);

const camelize = (name: string): string =>
  name.replaceAll(/-(?<letter>\w)/gu, (_match, letter: string) => letter.toUpperCase());

const componentName = (tag: string): string | null => {
  if (/^U[A-Z]/u.test(tag)) {
    return tag;
  }

  if (!tag.startsWith("u-")) {
    return null;
  }

  const pascal = camelize(tag);

  return pascal.charAt(0).toUpperCase() + pascal.slice(1);
};

const literalValue = (expression: string): string | null => {
  const trimmed = expression.trim();
  const quoted = LITERAL_STRING.exec(trimmed);

  if (quoted !== null) {
    return quoted.groups?.value ?? "";
  }

  return LITERAL_SCALAR.test(trimmed) ? trimmed : null;
};

const directiveArgument = (directive: DirectiveNode): string | null => {
  if (directive.arg === undefined) {
    return null;
  }

  return "isStatic" in directive.arg && directive.arg.isStatic ? directive.arg.content : DYNAMIC;
};

const recordProp = (component: ComponentAccumulator, name: string, value: string | null): void => {
  const prop = component.props.get(name) ?? {
    dynamic: 0,
    total: 0,
    values: new Map<string, number>(),
  };

  prop.total += 1;

  if (value === null) {
    prop.dynamic += 1;
  } else {
    increment(prop.values, value);
  }

  component.props.set(name, prop);
};

const recordDirective = (component: ComponentAccumulator, directive: DirectiveNode): void => {
  const argument = directiveArgument(directive);

  const expression =
    directive.exp !== undefined && "isStatic" in directive.exp ? directive.exp.content : "";

  switch (directive.name) {
    case "bind": {
      recordProp(
        component,
        argument === null ? "v-bind" : camelize(argument),
        literalValue(expression),
      );
      break;
    }

    case "on": {
      increment(component.events, argument ?? "v-on");
      break;
    }

    case "model": {
      recordProp(component, argument === null ? "v-model" : `v-model:${argument}`, null);
      break;
    }

    case "slot": {
      increment(component.slots, argument ?? "default");
      break;
    }

    default: {
      break;
    }
  }
};

const recordAttribute = (component: ComponentAccumulator, attribute: AttributeNode): void => {
  recordProp(component, camelize(attribute.name), attribute.value?.content ?? "true");
};

const recordChildSlots = (component: ComponentAccumulator, element: ElementNode): void => {
  for (const child of element.children) {
    if (!("tagType" in child) || child.tag !== "template") {
      continue;
    }

    for (const prop of child.props) {
      if ("modifiers" in prop && prop.name === "slot") {
        increment(component.slots, directiveArgument(prop) ?? "default");
      }
    }
  }
};

const instanceProps = (element: ElementNode): CallProps => {
  const props: StaticProp[] = [];
  const dynamic: string[] = [];

  for (const prop of element.props) {
    if (!("modifiers" in prop)) {
      props.push({ name: camelize(prop.name), value: prop.value?.content ?? "true" });
    } else if (prop.name === "bind" || prop.name === "model") {
      const argument = directiveArgument(prop);

      const name =
        prop.name === "model"
          ? `v-model:${argument ?? "modelValue"}`
          : camelize(argument ?? "v-bind");

      const value =
        prop.name === "bind" && prop.exp !== undefined && "isStatic" in prop.exp
          ? literalValue(prop.exp.content)
          : null;

      if (value === null) {
        dynamic.push(name);
      } else {
        props.push({ name, value });
      }
    }
  }

  return {
    dynamic: dynamic.toSorted(),
    props: props.toSorted((left, right) => left.name.localeCompare(right.name)),
  };
};

/** Default-slot content: anything but whitespace, comments and named-slot templates. */
const hasDefaultContent = (element: ElementNode): boolean =>
  element.children.some((child) => {
    if ("tagType" in child) {
      return (
        child.tag !== "template" ||
        child.props.every(
          (prop) =>
            !("modifiers" in prop) ||
            prop.name !== "slot" ||
            directiveArgument(prop) === null ||
            directiveArgument(prop) === "default",
        )
      );
    }

    return !child.loc.source.startsWith("<!--") && child.loc.source.trim() !== "";
  });

const createComponent = (): ComponentAccumulator => ({
  events: new Map(),
  files: new Map(),
  props: new Map(),
  recipes: new Map(),
  slots: new Map(),
  sources: new Map(),
});

const walkTemplate = (
  nodes: readonly TemplateChildNode[],
  visit: (element: ElementNode) => void,
): void => {
  for (const node of nodes) {
    if ("tagType" in node) {
      visit(node);
      walkTemplate(node.children, visit);
    }
  }
};

const visitComponent = (
  components: Map<string, ComponentAccumulator>,
  element: ElementNode,
  file: ScannedFile,
): void => {
  const name = componentName(element.tag);

  if (name === null) {
    return;
  }

  const component = components.get(name) ?? createComponent();

  increment(component.files, file.path);
  increment(component.sources, file.source);

  for (const prop of element.props) {
    if ("modifiers" in prop) {
      recordDirective(component, prop);
    } else {
      recordAttribute(component, prop);
    }
  }

  recordChildSlots(component, element);

  const call = {
    content: hasDefaultContent(element),
    ...instanceProps(element),
    source: file.source,
  };

  const key = JSON.stringify(call);
  const recipe = component.recipes.get(key) ?? { ...call, count: 0 };

  recipe.count += 1;
  component.recipes.set(key, recipe);
  components.set(name, component);
};

const scanTemplate = (
  components: Map<string, ComponentAccumulator>,
  source: string,
  file: ScannedFile,
): void => {
  const template = parse(source, { filename: file.path }).descriptor.template?.ast;

  if (template !== undefined) {
    walkTemplate(template.children, (element) => {
      visitComponent(components, element, file);
    });
  }
};

const recordSymbol = (
  symbols: Map<string, SymbolAccumulator>,
  name: string,
  filePath: string,
): void => {
  const symbol = symbols.get(name) ?? { files: new Map<string, number>() };

  increment(symbol.files, filePath);
  symbols.set(name, symbol);
};

const scanScript = (symbols: ScriptSymbols, source: string, filePath: string): void => {
  for (const match of source.matchAll(COMPOSABLE_CALL)) {
    recordSymbol(symbols.composables, match.groups?.name ?? "", filePath);
  }

  for (const match of source.matchAll(NUXT_UI_IMPORT)) {
    for (const specifier of (match.groups?.specifiers ?? "").split(",")) {
      const name =
        specifier
          .replace(/^\s*type\s+/u, "")
          .split(/\s+as\s+/u)[0]
          ?.trim() ?? "";

      if (name !== "") {
        recordSymbol(symbols.types, name, filePath);
      }
    }
  }
};

const toSymbols = (symbols: ReadonlyMap<string, SymbolAccumulator>): SymbolUsage[] =>
  [...symbols]
    .map(([name, symbol]) => ({ files: toFiles(symbol.files), name, total: sum(symbol.files) }))
    .toSorted(byTotalThenName);

const toComponent = (name: string, component: ComponentAccumulator): ComponentUsage => ({
  events: toTallies(component.events),
  files: toFiles(component.files),
  name,
  props: [...component.props]
    .map(([propName, prop]) => ({
      dynamic: prop.dynamic,
      name: propName,
      total: prop.total,
      values: toTallies(prop.values),
    }))
    .toSorted(byTotalThenName),
  recipes: [...component.recipes.values()].toSorted((left, right) => right.count - left.count),
  slots: toTallies(component.slots),
  sources: [...component.sources].map(([source, count]) => ({ count, source })),
  total: sum(component.files),
});

export const scanNuxtUiUsage = (repositoryRoot: string): Inventory => {
  const components = new Map<string, ComponentAccumulator>();
  const symbols: ScriptSymbols = { composables: new Map(), types: new Map() };

  for (const root of SOURCE_ROOTS) {
    const directory = path.join(repositoryRoot, root.dir);

    for (const file of globSync(["**/*.vue", "**/*.ts"], { cwd: directory })) {
      const absolute = path.join(directory, file);
      const relativePath = path.relative(repositoryRoot, absolute).replaceAll("\\", "/");
      const source = readFileSync(absolute, "utf-8");

      if (file.endsWith(".vue")) {
        scanTemplate(components, source, { path: relativePath, source: root.source });
      }

      scanScript(symbols, source, relativePath);
    }
  }

  return {
    components: [...components]
      .map(([name, component]) => toComponent(name, component))
      .toSorted(byTotalThenName),
    composables: toSymbols(symbols.composables),
    types: toSymbols(symbols.types),
  };
};
