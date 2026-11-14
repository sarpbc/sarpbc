import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const project = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(project, "src");
const configPath = path.join(project, "tsconfig.json");
const config = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));

if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));

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

const innerLayerPackage = /^(?:@sarpbc\/(?:types|utils)|uuid|node:crypto)(?:$|\/)/;

function importsOf(source: ts.SourceFile): string[] {
  const imports: string[] = [];

  function visit(node: ts.Node): void {
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
  }

  visit(source);

  return imports;
}

const persistenceFacade = /^[^/]+\/infrastructure\/[^/]+-persistence\.ts$/;

const isInner = (file: string, root: string): boolean =>
  ["domain", "application"].includes(layer(file, root));

const featureOf = (file: string, root: string): string => normalized(file, root).split("/")[0];

function defined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected a value in the feature graph.");

  return value;
}

type FeatureEdge = [from: string, target: string, via: string];

type FeatureGraph = Map<string, Map<string, string[]>>;

function stronglyConnected(graph: FeatureGraph): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let counter = 0;

  function visit(node: string): void {
    index.set(node, counter);
    low.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of [...(graph.get(node)?.keys() ?? [])].sort()) {
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

      components.push(component.sort());
    }
  }

  for (const node of [...graph.keys()].sort()) if (!index.has(node)) visit(node);

  return components;
}

function cyclePath(component: string[], graph: FeatureGraph): string[] | undefined {
  const members = new Set(component);
  const start = component[0];
  const path = [start];
  const seen = new Set([start]);

  function walk(node: string): string[] | undefined {
    for (const next of [...defined(graph.get(node)).keys()].sort()) {
      if (!members.has(next)) continue;

      if (next === start) return path.concat(start);

      if (seen.has(next)) continue;
      seen.add(next);
      path.push(next);
      const found = walk(next);

      if (found) return found;
      path.pop();
    }

    return undefined;
  }

  return walk(start);
}

function featureCycles(edges: FeatureEdge[]): string[] {
  const graph: FeatureGraph = new Map();

  for (const [from, target, via] of edges) {
    if (!graph.has(from)) graph.set(from, new Map());

    if (!graph.has(target)) graph.set(target, new Map());
    const importers = defined(graph.get(from)).get(target) ?? [];
    defined(graph.get(from)).set(target, [...importers, via].sort());
  }

  return stronglyConnected(graph)
    .filter((component) => component.length > 1)
    .map((component) => {
      const path = defined(cyclePath(component, graph));

      const imports = path
        .slice(0, -1)
        .map(
          (from, i) =>
            `${from} -> ${path[i + 1]}: ${defined(defined(graph.get(from)).get(path[i + 1]))[0]}`,
        );

      return [`feature cycle: ${path.join(" -> ")}`, ...imports.map((line) => `  ${line}`)].join(
        "\n",
      );
    });
}

export function architectureViolations(sourceFiles = files, root = sourceRoot): string[] {
  const violations: string[] = [];
  const featureEdges: FeatureEdge[] = [];

  for (const file of sourceFiles) {
    const origin = normalized(file, root);
    const originLayer = layer(file, root);

    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf-8"),
      ts.ScriptTarget.Latest,
      true,
    );

    for (const specifier of importsOf(source)) {
      if (specifier.startsWith("src/")) {
        violations.push(
          `${origin}: use a relative import so compiled Node.js resolves ${specifier}`,
        );
      }

      const module = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;

      const resolved = module
        ? { ...module, resolvedFileName: path.resolve(module.resolvedFileName) }
        : undefined;

      if (originLayer === "domain" || originLayer === "application") {
        const external = !specifier.startsWith(".") && !specifier.startsWith("src/");

        if (external && !innerLayerPackage.test(specifier)) {
          violations.push(`${origin}: ${originLayer} imports non-allowlisted package ${specifier}`);
          continue;
        }

        if (resolved && resolved.resolvedFileName.startsWith(root)) {
          const targetLayer = layer(resolved.resolvedFileName, root);
          const allowed = originLayer === "domain" ? ["domain"] : ["domain", "application"];

          if (!allowed.includes(targetLayer)) {
            violations.push(
              `${origin}: ${originLayer} imports ${normalized(resolved.resolvedFileName, root)}`,
            );
          }

          if (
            isInner(file, root) &&
            isInner(resolved.resolvedFileName, root) &&
            featureOf(file, root) !== featureOf(resolved.resolvedFileName, root)
          ) {
            featureEdges.push([
              featureOf(file, root),
              featureOf(resolved.resolvedFileName, root),
              origin,
            ]);
          }
        }
      }

      if (resolved && resolved.resolvedFileName.startsWith(root)) {
        const target = normalized(resolved.resolvedFileName, root);
        const feature = origin.split("/")[0];
        const targetFeature = target.split("/")[0];
        const composes = /(?:\.module|composition)\.ts$/.test(origin) || !origin.includes("/");
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
            (target.includes("/infrastructure/") &&
              /(?:repository|\.persistence)\.ts$/.test(target)))
        ) {
          violations.push(`${origin}: imports private persistence of ${targetFeature}: ${target}`);
        }
      }
    }
  }

  return [...violations, ...featureCycles(featureEdges)];
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const violations = architectureViolations();

  if (violations.length) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Architecture checked across ${files.length} source files.\n`);
  }
}
