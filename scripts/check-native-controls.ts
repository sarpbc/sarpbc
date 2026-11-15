import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const repository = path.resolve(import.meta.dirname, "..");
const appSources = ["apps/front/app", "apps/admin/app", "apps/catalog/src", "packages/ui/src"];

/* Each native control has a @sarpbc/design component that owns its look, focus and states. */
const REPLACEMENTS: ReadonlyMap<string, string> = new Map([
  ["button", "SButton for an action, SRadioGroup for a choice, SLink for navigation"],
  ["input", "SInput, SInputNumber, SCheckbox or SSwitch"],
  ["select", "SSelect or SCombobox"],
  ["textarea", "STextarea"],
]);

/*
 * A deliberate exception names its reason in a comment right before the tag:
 * <!-- native-control: hidden file input behind an SButton -->
 */
const ESCAPE = /<!--\s*native-control:\s*\S[^>]*-->\s*$/u;

const NATIVE_TAG = /<(?<tag>button|input|select|textarea)(?=[\s/>])/gu;

const vueFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : vueFiles(file);
    }

    return entry.name.endsWith(".vue") ? [file] : [];
  });

const templateOf = (source: string): { offset: number; text: string } | null => {
  const start = source.indexOf("<template");
  const end = source.lastIndexOf("</template>");

  return start === -1 || end === -1 ? null : { offset: start, text: source.slice(start, end) };
};

const lineAt = (source: string, offset: number): number =>
  source.slice(0, offset).split("\n").length;

export const nativeControlViolations = (directory: string, root = directory): string[] =>
  vueFiles(directory).flatMap((file) => {
    const source = readFileSync(file, "utf-8");
    const template = templateOf(source);

    if (template === null) {
      return [];
    }

    return [...template.text.matchAll(NATIVE_TAG)].flatMap((match) => {
      const tag = match.groups?.tag ?? "";

      if (ESCAPE.test(template.text.slice(0, match.index))) {
        return [];
      }

      const line = lineAt(source, template.offset + match.index);

      return [
        `${path.relative(root, file)}:${line}: <${tag}> — use ${REPLACEMENTS.get(tag) ?? "a @sarpbc/design component"}, or explain the exception with <!-- native-control: reason -->`,
      ];
    });
  });

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const violations = appSources.flatMap((directory) =>
    nativeControlViolations(path.join(repository, directory), repository),
  );

  if (violations.length > 0) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`${appSources.join(", ")} use @sarpbc/design for every control.\n`);
  }
}
