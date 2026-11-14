import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { z } from "zod";

const project = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(project, "src");
const snapshot = path.join(project, "test/contracts/http-routes.json");

const routeSchema = z.strictObject({
  controller: z.string(),
  verb: z.string(),
  path: z.string(),
  status: z.string().nullable(),
  guards: z.array(z.string()),
  permissions: z.array(z.string()),
});

type Route = z.infer<typeof routeSchema>;

interface Decorator {
  name: string;
  args: string[];
}

interface SourceText {
  file: string;
  text: string;
}

function filesIn(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);

    return entry.isDirectory()
      ? filesIn(file)
      : file.endsWith(".ts") && !file.endsWith(".test.ts")
        ? [file]
        : [];
  });
}

const packagesRoot = path.resolve(project, "../../packages");

function stringConstants() {
  const constants = new Map();

  for (const pkg of fs.readdirSync(packagesRoot)) {
    const dir = path.join(packagesRoot, pkg, "src");

    if (!fs.existsSync(dir)) continue;

    for (const file of filesIn(dir)) {
      const source = ts.createSourceFile(
        file,
        fs.readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );

      for (const statement of source.statements) {
        if (!ts.isVariableStatement(statement)) continue;

        for (const declaration of statement.declarationList.declarations) {
          let value = declaration.initializer;

          while (value && (ts.isAsExpression(value) || ts.isSatisfiesExpression(value))) {
            value = value.expression;
          }

          if (
            ts.isIdentifier(declaration.name) &&
            value &&
            ts.isArrayLiteralExpression(value) &&
            value.elements.every(ts.isStringLiteral)
          ) {
            constants.set(
              declaration.name.text,
              value.elements.map((element) => element.getText(source)),
            );
          }
        }
      }
    }
  }

  return constants;
}

const constants = stringConstants();

function decoratorArguments(expression: ts.CallExpression, source: ts.SourceFile): string[] {
  return expression.arguments.flatMap((argument) => {
    if (!ts.isSpreadElement(argument)) return [argument.getText(source)];
    const values = constants.get(argument.expression.getText(source));
    assert(
      values,
      `${source.fileName}: cannot resolve ${argument.getText(source)} to a workspace string array constant`,
    );

    return values;
  });
}

function decorators(node: ts.Node, source: ts.SourceFile): Decorator[] {
  return (ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []).flatMap((decorator) => {
    const expression = decorator.expression;

    return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
      ? [
          {
            name: expression.expression.text,
            args: decoratorArguments(expression, source),
          },
        ]
      : [];
  });
}

function collectRoutes(sources: SourceText[]): Route[] {
  const routes: Route[] = [];

  for (const { file, text } of sources) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

    for (const statement of source.statements) {
      if (!ts.isClassDeclaration(statement)) continue;
      const classDecorators = decorators(statement, source);
      const controller = classDecorators.find((decorator) => decorator.name === "Controller");

      if (!controller) continue;
      const prefix = controller.args[0] ?? '""';

      for (const method of statement.members) {
        if (!ts.isMethodDeclaration(method)) continue;

        for (const parameter of method.parameters) {
          const dto = parameter.type?.getText(source);

          const input = decorators(parameter, source).find((decorator) =>
            ["Body", "Query"].includes(decorator.name),
          );

          if (!input || !dto?.endsWith("Dto")) continue;
          assert(
            input.args.some((argument) => new RegExp(`\\bschema:\\s*${dto}\\b`).test(argument)),
            `${file}: ${method.name.getText(source)} must attach the ${dto} schema to @${input.name}`,
          );
        }

        const methodDecorators = decorators(method, source);

        for (const route of methodDecorators.filter((decorator) =>
          ["Get", "Post", "Put", "Patch", "Delete", "Head", "Options", "All"].includes(
            decorator.name,
          ),
        )) {
          const effective = [...classDecorators, ...methodDecorators];
          routes.push({
            controller: prefix.replaceAll("'", '"'),
            verb: route.name.toUpperCase(),
            path: (route.args[0] ?? '""').replaceAll("'", '"'),
            status:
              methodDecorators.find((decorator) => decorator.name === "HttpCode")?.args[0] ?? null,
            guards: effective
              .filter((decorator) => decorator.name === "UseGuards")
              .flatMap((decorator) => decorator.args),
            permissions: effective
              .filter((decorator) => decorator.name === "RequirePermissions")
              .flatMap((decorator) => decorator.args)
              .map((argument) => argument.replaceAll("'", '"')),
          });
        }
      }
    }
  }

  return routes.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

const sources = filesIn(sourceRoot).map((file) => ({ file, text: fs.readFileSync(file, "utf8") }));
const actual = collectRoutes(sources);

if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(snapshot), { recursive: true });
  fs.writeFileSync(snapshot, `${JSON.stringify(actual, null, 2)}\n`);
  process.stdout.write(`Recorded ${actual.length} HTTP routes.\n`);
} else {
  assert.deepEqual(
    actual,
    z.array(routeSchema).parse(JSON.parse(fs.readFileSync(snapshot, "utf8"))),
    "HTTP routes, status overrides, guards and permissions changed. If intended, run `pnpm --filter back test:contracts --write` then `pnpm --filter back fmt`, and commit test/contracts/http-routes.json.",
  );
  process.stdout.write(`Verified ${actual.length} HTTP route contracts.\n`);
}
