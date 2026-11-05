import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const project = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(project, "src");
const snapshot = path.join(project, "test/contracts/http-routes.json");

function filesIn(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory()
      ? filesIn(file)
      : file.endsWith(".ts") && !file.endsWith(".test.ts")
        ? [file]
        : [];
  });
}

function decorators(node, source) {
  return (ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : []).flatMap((decorator) => {
    const expression = decorator.expression;
    return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
      ? [
          {
            name: expression.expression.text,
            args: expression.arguments.map((argument) => argument.getText(source)),
          },
        ]
      : [];
  });
}

function collectRoutes(sources) {
  const routes = [];
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
    JSON.parse(fs.readFileSync(snapshot, "utf8")),
    "HTTP routes, status overrides, guards and permissions changed",
  );
  process.stdout.write(`Verified ${actual.length} HTTP route contracts.\n`);
}
