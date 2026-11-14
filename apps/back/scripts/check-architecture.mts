import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const project = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(project, "src");
const configPath = path.join(project, "tsconfig.json");
const config = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));

if (config.error) {
  throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
}

const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, project);

const files = parsed.fileNames
  .map((file) => path.resolve(file))
  .filter(
    (file) => file.startsWith(sourceRoot) && !file.endsWith(".test.ts") && !file.endsWith(".d.ts"),
  );

const normalized = (file: string, root: string): string =>
  path.relative(root, file).split(path.sep).join("/");

const layer = (file: string, root: string): string =>
  normalized(file, root)
    .split("/")
    .find((part) => ["domain", "application", "infrastructure"].includes(part)) ?? "";

const innerLayerPackage = /^(?:@sarpbc\/(?:types|utils)|uuid|node:crypto)(?:$|\/)/u;

const importsOf = (source: ts.SourceFile): string[] => {
  const imports: string[] = [];

  const visit = function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      imports.push(node.argument.literal.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return imports;
};

const persistenceFacade = /^[^/]+\/infrastructure\/[^/]+-persistence\.ts$/u;

const isInner = (file: string, root: string): boolean =>
  ["domain", "application"].includes(layer(file, root));

const featureOf = (file: string, root: string): string => normalized(file, root).split("/")[0];

const defined = <T,>(value: T | undefined): T => {
  if (value === undefined) {
    throw new Error("Expected a value in the feature graph.");
  }

  return value;
};

type FeatureEdge = [from: string, target: string, via: string];

type FeatureGraph = Map<string, Map<string, string[]>>;

const stronglyConnected = (graph: FeatureGraph): string[][] => {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let counter = 0;

  const visit = (node: string): void => {
    index.set(node, counter);
    low.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of [...(graph.get(node)?.keys() ?? [])].toSorted()) {
      if (!index.has(next)) {
        visit(next);
        low.set(node, Math.min(defined(low.get(node)), defined(low.get(next))));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(defined(low.get(node)), defined(index.get(next))));
      }
    }

    if (low.get(node) === index.get(node)) {
      const component: string[] = [];
      let member: string;

      do {
        member = defined(stack.pop());
        onStack.delete(member);
        component.push(member);
      } while (member !== node);

      components.push(component.toSorted());
    }
  };

  for (const node of [...graph.keys()].toSorted()) {
    if (!index.has(node)) {
      visit(node);
    }
  }

  return components;
};

const cyclePath = (component: string[], graph: FeatureGraph): string[] | undefined => {
  const members = new Set(component);
  const [start] = component;
  const trail = [start];
  const seen = new Set([start]);

  const walk = (node: string): string[] | undefined => {
    for (const next of [...defined(graph.get(node)).keys()].toSorted()) {
      if (!members.has(next)) {
        continue;
      }

      if (next === start) {
        return [...trail, start];
      }

      if (seen.has(next)) {
        continue;
      }

      seen.add(next);
      trail.push(next);
      const found = walk(next);

      if (found) {
        return found;
      }

      trail.pop();
    }

    return undefined;
  };

  return walk(start);
};

const featureCycles = (edges: FeatureEdge[]): string[] => {
  const graph: FeatureGraph = new Map();

  for (const [from, target, via] of edges) {
    if (!graph.has(from)) {
      graph.set(from, new Map());
    }

    if (!graph.has(target)) {
      graph.set(target, new Map());
    }

    const importers = defined(graph.get(from)).get(target) ?? [];
    defined(graph.get(from)).set(target, [...importers, via].toSorted());
  }

  return stronglyConnected(graph)
    .filter((component) => component.length > 1)
    .map((component) => {
      const cycle = defined(cyclePath(component, graph));

      const imports = cycle
        .slice(0, -1)
        .map(
          (from, i) =>
            `${from} -> ${cycle[i + 1]}: ${defined(defined(graph.get(from)).get(cycle[i + 1]))[0]}`,
        );

      return [`feature cycle: ${cycle.join(" -> ")}`, ...imports.map((line) => `  ${line}`)].join(
        "\n",
      );
    });
};

interface ImportSite {
  file: string;
  origin: string;
  originLayer: string;
  specifier: string;
  resolved: string | undefined;
}

const innerLayerViolations = (
  site: ImportSite,
  root: string,
  featureEdges: FeatureEdge[],
): string[] => {
  const { file, origin, originLayer, specifier, resolved } = site;
  const external = !specifier.startsWith(".") && !specifier.startsWith("src/");

  if (external && !innerLayerPackage.test(specifier)) {
    return [`${origin}: ${originLayer} imports non-allowlisted package ${specifier}`];
  }

  if (resolved === undefined || !resolved.startsWith(root)) {
    return [];
  }

  const violations: string[] = [];
  const allowed = originLayer === "domain" ? ["domain"] : ["domain", "application"];

  if (!allowed.includes(layer(resolved, root))) {
    violations.push(`${origin}: ${originLayer} imports ${normalized(resolved, root)}`);
  }

  if (
    isInner(file, root) &&
    isInner(resolved, root) &&
    featureOf(file, root) !== featureOf(resolved, root)
  ) {
    featureEdges.push([featureOf(file, root), featureOf(resolved, root), origin]);
  }

  return violations;
};

const crossFeatureViolations = (site: ImportSite, root: string): string[] => {
  const { origin, resolved } = site;

  if (resolved === undefined || !resolved.startsWith(root)) {
    return [];
  }

  const violations: string[] = [];
  const target = normalized(resolved, root);
  const [feature] = origin.split("/");
  const [targetFeature] = target.split("/");
  const composes = /(?:\.module|composition)\.ts$/u.test(origin) || !origin.includes("/");
  const sharedTarget = targetFeature === "common";

  if (feature === "common" && !sharedTarget && targetFeature !== "infrastructure") {
    violations.push(`${origin}: common imports feature code ${target}`);
  }

  if (
    feature !== targetFeature &&
    !composes &&
    !sharedTarget &&
    !persistenceFacade.test(target) &&
    (target.includes("/infrastructure/persistence/") ||
      (target.includes("/infrastructure/") && /(?:repository|\.persistence)\.ts$/u.test(target)))
  ) {
    violations.push(`${origin}: imports private persistence of ${targetFeature}: ${target}`);
  }

  return violations;
};

const importViolations = (
  site: ImportSite,
  root: string,
  featureEdges: FeatureEdge[],
): string[] => {
  const violations: string[] = [];

  if (site.specifier.startsWith("src/")) {
    violations.push(
      `${site.origin}: use a relative import so compiled Node.js resolves ${site.specifier}`,
    );
  }

  if (site.originLayer === "domain" || site.originLayer === "application") {
    violations.push(...innerLayerViolations(site, root, featureEdges));
  }

  return [...violations, ...crossFeatureViolations(site, root)];
};

export const architectureViolations = (sourceFiles = files, root = sourceRoot): string[] => {
  const violations: string[] = [];
  const featureEdges: FeatureEdge[] = [];

  for (const file of sourceFiles) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf-8"),
      ts.ScriptTarget.Latest,
      true,
    );

    for (const specifier of importsOf(source)) {
      const module = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;

      violations.push(
        ...importViolations(
          {
            file,
            origin: normalized(file, root),
            originLayer: layer(file, root),
            specifier,
            resolved: module ? path.resolve(module.resolvedFileName) : undefined,
          },
          root,
          featureEdges,
        ),
      );
    }
  }

  return [...violations, ...featureCycles(featureEdges)];
};

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const violations = architectureViolations();

  if (violations.length) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Architecture checked across ${files.length} source files.\n`);
  }
}
