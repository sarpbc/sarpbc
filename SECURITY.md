# Security Policy

## Supported versions

Security fixes are applied to the default branch (`main`) of this repository.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Prefer one of:

1. **GitHub Security Advisories** — [Report a vulnerability](https://github.com/sarpbc/sarpbc/security/advisories/new) on this repository (private disclosure).
2. Email the maintainers if Advisories are unavailable: **security@sarpbc.org** (or contact a maintainer listed on the GitHub org).

Include:

- Description of the issue and impact
- Steps to reproduce or a proof of concept
- Affected component (`apps/front`, `apps/back`, `apps/admin`) if known

We will acknowledge receipt when possible and coordinate a fix before any public disclosure.

## Scope notes

- Staff roles are assigned in the database by maintainers; there is no public self-service role escalation API.
- Production secrets must live in the deployment environment (e.g. Dokploy / Docker secrets), never in git.
- Auth endpoints are rate-limited; please do not load-test production without permission.

## Secret scanning

Before going public we ran [gitleaks](https://github.com/gitleaks/gitleaks) on full git history.

- Tracked source is clean of production credentials (`.env` files are gitignored and were never committed).
- One historical hit: a removed client-side analytics UUID in a deleted `visitors.client.ts` plugin. Treat that service token as compromised if the account still exists and rotate or disable it.
