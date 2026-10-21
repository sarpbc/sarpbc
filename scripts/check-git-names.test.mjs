import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = fileURLToPath(new URL("./check-git-names.mjs", import.meta.url));
const types = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "docs",
  "style",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "sarpbc-git-names-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function run(args, options = {}) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8", ...options });
}

function expectStatus(result, status) {
  assert.equal(result.status, status, result.stderr);
}

test("branches accept every allowed type and main", () => {
  for (const type of types) expectStatus(run(["branch", `${type}/159-player-search`]), 0);
  expectStatus(run(["branch", "main"]), 0);
});

test("branches reject agent prefixes and malformed names", () => {
  for (const name of [
    "codex/player-search",
    "cursor/player-search",
    "claude/player-search",
    "feature/player-search",
    "Feat/player-search",
    "feat/Player-search",
    "feat/",
    "feat/-search",
    "feat/search-",
    "feat/player--search",
    "feat/player/search",
    "feat/search\n",
  ]) {
    expectStatus(run(["branch", name]), 1);
  }
});

test("commit messages accept scopes, breaking changes and multiline bodies", (t) => {
  const message = join(fixture(t), "commit message.txt");
  for (const subject of [
    ...types.map((type) => `${type}: update player search`),
    "fix(back): réparer la synchronisation",
    "feat!: change player response",
    "feat(api)!: change player response",
  ]) {
    writeFileSync(message, `${subject}\r\n\r\nDetails about this change.\r\n`);
    expectStatus(run(["commit-msg", message]), 0);
  }
});

test("commit messages reject agent prefixes and malformed subjects", (t) => {
  const message = join(fixture(t), "COMMIT_EDITMSG");
  for (const subject of [
    "codex: update search",
    "cursor: update search",
    "claude: update search",
    "update search",
    "Feat: update search",
    "feat: ",
    "feat:   ",
    "feat:update search",
    "feat(): update search",
    "fixup! feat: update search",
    "Merge branch 'main'",
    "",
  ]) {
    writeFileSync(message, subject);
    expectStatus(run(["commit-msg", message]), 1);
  }
});

test("commit messages reject agent co-authors and keep human ones", (t) => {
  const message = join(fixture(t), "COMMIT_EDITMSG");
  for (const trailer of [
    "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
    "Co-authored-by: Cursor Agent <cursoragent@cursor.com>",
    "co-authored-by: Codex <codex@openai.com>",
    "Claude-Session: https://claude.ai/code/session_01",
  ]) {
    writeFileSync(message, `fix: repair search\r\n\r\nDetails.\r\n\r\n${trailer}\r\n`);
    expectStatus(run(["commit-msg", message]), 1);
  }
  writeFileSync(
    message,
    "fix(back): repair redis cursor\n\nCo-authored-by: Jane Doe <jane@example.com>\n",
  );
  expectStatus(run(["commit-msg", message]), 0);
});

test("pushes check destination branches, including refspecs and multiple refs", () => {
  const sha = "a".repeat(40);
  const zero = "0".repeat(40);
  const valid = `refs/heads/feat/search ${sha} refs/heads/feat/search ${zero}\n`;
  expectStatus(run(["pre-push"], { input: valid }), 0);
  expectStatus(
    run(["pre-push"], {
      input: `${valid}refs/heads/feat/search ${sha} refs/heads/codex/search ${zero}\n`,
    }),
    1,
  );
  expectStatus(
    run(["pre-push"], {
      input: `(delete) ${zero} refs/heads/claude/search ${sha}\nrefs/tags/v1 ${sha} refs/tags/v1 ${zero}\n`,
    }),
    0,
  );
  expectStatus(run(["pre-push"], { input: "" }), 0);
});

test("PR checks inspect real commits and exclude existing history", (t) => {
  const directory = fixture(t);
  const git = (...args) =>
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Naming Test",
        "-c",
        "user.email=naming@example.com",
        "-c",
        `core.hooksPath=${join(directory, "no-hooks")}`,
        ...args,
      ],
      { cwd: directory, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  git("init", "-b", "main");
  git("commit", "--allow-empty", "-m", "Historical nonconforming subject");
  const base = git("rev-parse", "HEAD");
  git("switch", "-c", "feat/search");
  expectStatus(run(["branch"], { cwd: directory }), 0);
  git("commit", "--allow-empty", "-m", "feat(front): add player search");
  const eventPath = join(directory, "event.json");
  const pr = {
    title: "feat(front): add player search",
    base: { sha: base },
    head: { ref: "feat/search", sha: git("rev-parse", "HEAD") },
  };
  const checkPr = () => {
    writeFileSync(eventPath, JSON.stringify({ pull_request: pr }));
    return run(["pr"], { cwd: directory, env: { ...process.env, GITHUB_EVENT_PATH: eventPath } });
  };
  expectStatus(checkPr(), 0);
  pr.title = "Add player search";
  expectStatus(checkPr(), 1);
  pr.title = "feat: add player search";
  pr.head.ref = "claude/search";
  expectStatus(checkPr(), 1);
  pr.head.ref = "feat/search";
  git("commit", "--allow-empty", "-m", "cursor: generated update");
  git("commit", "--allow-empty", "-m", "fix: repair search");
  pr.head.sha = git("rev-parse", "HEAD");
  const result = checkPr();
  expectStatus(result, 1);
  assert.match(result.stderr, /cursor: generated update/);
  pr.base.sha = pr.head.sha;
  git(
    "commit",
    "--allow-empty",
    "-m",
    "fix: repair search",
    "-m",
    "Co-authored-by: Codex <codex@openai.com>",
  );
  pr.head.sha = git("rev-parse", "HEAD");
  assert.match(checkPr().stderr, /Co-authored-by: Codex/);
  git("commit", "--amend", "--allow-empty", "-m", "fix: repair search");
  pr.head.sha = git("rev-parse", "HEAD");
  expectStatus(checkPr(), 0);
  pr.body = "Summary.\n\nCo-Authored-By: Claude <noreply@anthropic.com>";
  expectStatus(checkPr(), 1);
  git("switch", "--detach");
  expectStatus(run(["branch"], { cwd: directory }), 1);
});
