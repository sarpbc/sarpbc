import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const types = "feat|fix|perf|refactor|docs|style|test|build|ci|chore|revert";
const branchPattern = new RegExp(`^(${types})/[a-z0-9]+(?:-[a-z0-9]+)*$`);
const subjectPattern = new RegExp(`^(${types})(\\([a-z0-9][a-z0-9/-]*\\))?!?: \\S.*$`);

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function checkBranch(branch) {
  if (branch !== "main" && !branchPattern.test(branch)) {
    throw new Error(
      `Invalid branch ${JSON.stringify(branch)}. Use <type>/<kebab-case-description>, e.g. feat/player-search. Allowed types: ${types.replaceAll("|", ", ")}.`,
    );
  }
}

function checkSubject(subject, label) {
  if (!subjectPattern.test(subject)) {
    throw new Error(
      `Invalid ${label} ${JSON.stringify(subject)}. Use <type>(optional-scope): description, e.g. fix(back): repair player sync. Allowed types: ${types.replaceAll("|", ", ")}.`,
    );
  }
}

try {
  switch (process.argv[2]) {
    case "branch": {
      checkBranch(process.argv[3] ?? git("symbolic-ref", "--quiet", "--short", "HEAD"));
      break;
    }
    case "commit-msg": {
      const subject = readFileSync(process.argv[3], "utf8").split(/\r?\n/, 1)[0];
      checkSubject(subject, "commit subject");
      break;
    }
    case "pre-push": {
      for (const line of readFileSync(0, "utf8").trim().split(/\r?\n/)) {
        if (!line) continue;
        const [, localSha, remoteRef] = line.split(/\s+/);
        if (/^0+$/.test(localSha) || !remoteRef.startsWith("refs/heads/")) continue;
        checkBranch(remoteRef.slice("refs/heads/".length));
      }
      break;
    }
    case "pr": {
      const { pull_request: pr } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
      checkBranch(pr.head.ref);
      checkSubject(pr.title, "pull request title");
      const commits = git("log", "--format=%H%x00%s", `${pr.base.sha}..${pr.head.sha}`, "--");
      for (const line of commits.split("\n")) {
        if (!line) continue;
        const [sha, subject] = line.split("\0");
        checkSubject(subject, `commit ${sha}`);
      }
      break;
    }
    default:
      throw new Error(
        "Usage: node scripts/check-git-names.mjs <branch [name]|commit-msg <file>|pre-push|pr>",
      );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
