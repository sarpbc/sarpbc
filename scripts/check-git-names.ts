import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { z } from "zod";

const types = "feat|fix|perf|refactor|docs|style|test|build|ci|chore|revert";
const branchPattern = new RegExp(`^(${types})/[a-z0-9]+(?:-[a-z0-9]+)*$`);
const subjectPattern = new RegExp(`^(${types})(\\([a-z0-9][a-z0-9/-]*\\))?!?: \\S.*$`);

const agentTrailerPattern =
  /^(?:co-authored-by:.*\b(?:claude|codex|cursor|anthropic|openai)\b.*|(?:claude|codex|cursor)-session:.*)$/im;

const pullRequestEvent = z.object({
  pull_request: z.object({
    title: z.string(),
    body: z.string().nullish(),
    base: z.object({ sha: z.string() }),
    head: z.object({ ref: z.string(), sha: z.string() }),
  }),
});

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function checkBranch(branch: string): void {
  if (branch !== "main" && !branchPattern.test(branch)) {
    throw new Error(
      `Invalid branch ${JSON.stringify(branch)}. Use <type>/<kebab-case-description>, e.g. feat/player-search. Allowed types: ${types.replaceAll("|", ", ")}.`,
    );
  }
}

function checkSubject(subject: string, label: string): void {
  if (!subjectPattern.test(subject)) {
    throw new Error(
      `Invalid ${label} ${JSON.stringify(subject)}. Use <type>(optional-scope): description, e.g. fix(back): repair player sync. Allowed types: ${types.replaceAll("|", ", ")}.`,
    );
  }
}

function checkTrailers(message: string, label: string): void {
  const trailer = message.match(agentTrailerPattern)?.[0];

  if (trailer !== undefined) {
    throw new Error(
      `Invalid ${label}: remove ${JSON.stringify(trailer.trim())}. Agents are not credited as co-authors.`,
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
      const message = readFileSync(process.argv[3], "utf8");
      checkSubject(message.split(/\r?\n/, 1)[0], "commit subject");
      checkTrailers(message, "commit message");
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
      const eventPath = process.env.GITHUB_EVENT_PATH;

      if (eventPath === undefined) throw new Error("GITHUB_EVENT_PATH is not set.");

      const { pull_request: pr } = pullRequestEvent.parse(
        JSON.parse(readFileSync(eventPath, "utf8")),
      );

      checkBranch(pr.head.ref);
      checkSubject(pr.title, "pull request title");
      checkTrailers(pr.body ?? "", "pull request description");

      const commits = git("log", "-z", "--format=%H%n%B", `${pr.base.sha}..${pr.head.sha}`, "--");

      for (const commit of commits.split("\0")) {
        if (!commit) continue;
        const [sha, subject] = commit.split("\n");
        checkSubject(subject, `commit ${sha}`);
        checkTrailers(commit, `commit ${sha}`);
      }

      break;
    }

    default:
      throw new Error(
        "Usage: node scripts/check-git-names.ts <branch [name]|commit-msg <file>|pre-push|pr>",
      );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
