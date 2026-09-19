# Security

`djsk` gives whoever it's configured to trust **arbitrary code execution**
inside the bot process (`jsk js`/`jsk cjs`/`jsk mjs`) and, optionally,
**arbitrary shell command execution** on the host (`jsk sh`). This is the
entire point of the tool — it's a debugging console for the bot's operator —
but it means the access-control config is as sensitive as a root SSH
authorized_keys file. Treat it accordingly.

## Who can use it

Resolved by `OwnerResolver` (`src/owners.ts`), in order:

1. **`owners` config option**, if set — an explicit user ID allowlist. This
   is what any real deployment should use; don't rely on (2).
2. Otherwise, the Discord application's owner or team members (fetched from
   Discord, cached after first lookup).
3. For selfbots (user accounts, not bot accounts), the logged-in user
   itself.

`shellOwners` is a separate, optional, stricter allowlist for `jsk sh`
specifically — use it to grant eval access to more people than get raw shell
access to the host.

**Anyone in these lists can read/exfiltrate the bot token, secrets in
`process.env`, and the database, and can run anything on the host if they
also have `jsk sh`.** Adding a user ID here is equivalent to giving them
that access. Review this list whenever it's changed, same as you would a
production credential.

## What's *not* protected

- `djsk` does not rate-limit or audit-log command usage beyond what
  `consoleLog` prints. Anyone in the owner list can act without a paper
  trail beyond the process's stdout.
- `update`/`restart` command config (`updateCommand`/`restartCommand`) lets
  an owner trigger a real deploy/service-restart on the host from a Discord
  message. Point these at trusted, idempotent scripts only — never at
  something that takes unsanitized input.
- The eval sandbox (`jsk js`/`jsk cjs`) runs in the *same process and realm*
  as the bot, not a separate VM/container — `prototype-guard.ts` hardens
  against specific known escape patterns, but this is not a security
  boundary against a determined owner. It's there to make accidental
  mistakes (a runaway loop, a broken prototype patch) less likely to take
  the whole process down, not to sandbox against a malicious operator.

## Security mode (`security: true`)

Best-effort **output redaction**, not access control — it doesn't change who
can run code, only what leaks in what djsk sends back. See `src/security.ts`
for the exact heuristics: exact-literal matching (bot token, any
secret-shaped `process.env` value, extra `secretValues`), `.env`-style
assignment lines, and a small built-in set of credential formats (Discord
tokens/webhooks, bearer tokens, PEM keys), extensible via `secretPatterns`.

This is heuristic and **will miss things** — e.g. a secret fetched from
somewhere other than `process.env`, or one deliberately reconstructed at
runtime (`a + b`) inside eval'd code. It also cannot catch a raw `fetch()`
call that uses the token directly, bypassing the patched Discord library
methods entirely (documented in `jishaku.ts`/README). Don't treat it as a
substitute for keeping the owner list tight — it reduces *accidental*
leakage (screen-sharing a debug session, pasting eval output into a public
channel), not intentional exfiltration by someone already trusted with eval
access.

## Reporting

This package has no dedicated disclosure process at the time of writing. If
you find an issue, open a GitHub issue or reach the maintainer directly
rather than filing it publicly if it's a real sandbox-escape/RCE-beyond-owner
finding.
