#!/usr/bin/env node
/**
 * CI guardrail: ban arbitrary hub row heights in apps/front.
 * See apps/front/DESIGN.md — Grid module / Contributing rules.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = import.meta.dirname;
const FRONT_ROOT = path.resolve(__dirname, "..");

const SCAN_ROOTS = [path.join(FRONT_ROOT, "app")];
const FILE_EXTENSIONS = new Set([".vue", ".ts", ".tsx", ".js", ".jsx"]);

const RULES = [
  { id: "h-11.25", pattern: /\bh-11\.25\b/ },
  { id: "h-11.5", pattern: /\bh-11\.5\b/ },
  { id: "h-8.25", pattern: /\bh-8\.25\b/ },
  { id: "h-67", pattern: /\bh-67(\.\d+)?\b/ },
  { id: "mt-11", pattern: /\bmt-11\b/ },
  { id: "leading-5.5", pattern: /\bleading-5\.5\b/ },
  { id: "py-[", pattern: /\bpy-\[/ },
];

interface Violation {
  file: string;
  line: number;
  rule: string;
  text: string;
}

async function collectFiles(dir: string, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".nuxt" || entry.name === "dist") {
        continue;
      }

      await collectFiles(fullPath, files);
      continue;
    }

    const ext = path.extname(entry.name);

    if (FILE_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanFile(filePath: string, content: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: path.relative(FRONT_ROOT, filePath),
          line: index + 1,
          rule: rule.id,
          text: line.trim(),
        });
      }
    }
  }

  return violations;
}

async function main(): Promise<void> {
  const files: string[] = [];

  for (const root of SCAN_ROOTS) {
    await collectFiles(root, files);
  }

  const violations: Violation[] = [];

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    violations.push(...scanFile(file, content));
  }

  if (violations.length === 0) {
    console.log("lint-hub-row-heights: ok");

    return;
  }

  console.error("lint-hub-row-heights: banned hub row height utilities found:\n");

  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}  [${violation.rule}]  ${violation.text}`);
  }

  console.error(
    "\nUse grid-module tokens (h-row, h-row-compact, h-row-header). See apps/front/DESIGN.md.",
  );
  process.exit(1);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
