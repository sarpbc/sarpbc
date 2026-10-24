import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(project, "src");
const configPath = path.join(project, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, project);
const files = parsed.fileNames
  .map((file) => path.resolve(file))
  .filter(
    (file) => file.startsWith(sourceRoot) && !file.endsWith(".test.ts") && !file.endsWith(".d.ts"),
  );
const normalized = (file) => path.relative(sourceRoot, file).split(path.sep).join("/");
const layer = (file) =>
  normalized(file)
    .split("/")
    .find((part) => ["domain", "application", "infrastructure"].includes(part));
const technicalPackage =
  /^(?:@nestjs\/|@mikro-orm\/|fastify(?:$|\/)|@fastify\/|ioredis(?:$|\/)|@aws-sdk\/|@googleapis\/|axios(?:$|\/)|posthog-node(?:$|\/)|evlog(?:$|\/)|@modelcontextprotocol\/)/;

function importsOf(source) {
  const imports = [];
  function visit(node) {
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

const isInner = (file) => ["domain", "application"].includes(layer(file));
const featureOf = (file) => normalized(file).split("/")[0];

function stronglyConnected(graph) {
  const index = new Map();
  const low = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  let counter = 0;
  function visit(node) {
    index.set(node, counter);
    low.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of [...(graph.get(node)?.keys() ?? [])].sort()) {
      if (!index.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node), index.get(next)));
      }
    }
    if (low.get(node) === index.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      components.push(component.sort());
    }
  }
  for (const node of [...graph.keys()].sort()) if (!index.has(node)) visit(node);
  return components;
}

function cyclePath(component, graph) {
  const members = new Set(component);
  const start = component[0];
  const path = [start];
  const seen = new Set([start]);
  function walk(node) {
    for (const next of [...graph.get(node).keys()].sort()) {
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

function featureCycles(edges) {
  const graph = new Map();
  for (const [from, target, via] of edges) {
    if (!graph.has(from)) graph.set(from, new Map());
    if (!graph.has(target)) graph.set(target, new Map());
    const importers = graph.get(from).get(target) ?? [];
    graph.get(from).set(target, [...importers, via].sort());
  }
  return stronglyConnected(graph)
    .filter((component) => component.length > 1)
    .map((component) => {
      const path = cyclePath(component, graph);
      const imports = path
        .slice(0, -1)
        .map((from, i) => `${from} -> ${path[i + 1]}: ${graph.get(from).get(path[i + 1])[0]}`);
      return [`feature cycle: ${path.join(" -> ")}`, ...imports.map((line) => `  ${line}`)].join(
        "\n",
      );
    });
}

export function architectureViolations(sourceFiles = files) {
  const violations = [];
  const featureEdges = [];
  for (const file of sourceFiles) {
    const origin = normalized(file);
    const originLayer = layer(file);
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
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
        if (technicalPackage.test(specifier)) {
          violations.push(`${origin}: ${originLayer} imports technical package ${specifier}`);
          continue;
        }
        if (resolved && resolved.resolvedFileName.startsWith(sourceRoot)) {
          const targetLayer = layer(resolved.resolvedFileName);
          const allowed = originLayer === "domain" ? ["domain"] : ["domain", "application"];
          if (!allowed.includes(targetLayer)) {
            violations.push(
              `${origin}: ${originLayer} imports ${normalized(resolved.resolvedFileName)}`,
            );
          }
          if (
            isInner(file) &&
            isInner(resolved.resolvedFileName) &&
            featureOf(file) !== featureOf(resolved.resolvedFileName)
          ) {
            featureEdges.push([featureOf(file), featureOf(resolved.resolvedFileName), origin]);
          }
        }
      }
      if (resolved && resolved.resolvedFileName.startsWith(sourceRoot)) {
        const target = normalized(resolved.resolvedFileName);
        const feature = origin.split("/")[0];
        const targetFeature = target.split("/")[0];
        if (
          feature !== targetFeature &&
          target.includes("/infrastructure/") &&
          /(?:repository|\.persistence)\.ts$/.test(target)
        ) {
          violations.push(`${origin}: imports private persistence of ${targetFeature}: ${target}`);
        }
      }
    }
  }
  return [...violations, ...featureCycles(featureEdges)];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = architectureViolations();
  if (violations.length) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Architecture checked across ${files.length} source files.\n`);
  }
}
