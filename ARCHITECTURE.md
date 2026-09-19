# Architecture

`djsk` is a standalone npm package (a Discord.js port of Python's
[jishaku](https://github.com/Gorialis/jishaku)) — a debugging/diagnostics
toolkit you attach to a bot's `Client`. It has no server, no database, and no
deployment of its own; it's a library consumed by other bots in this
monorepo (`sarp-utilities`, via the `djsko` workspace member).

## Entry points

- **`src/index.ts`** — public package exports.
- **`src/jishaku.ts`** — the `Jishaku` class. Constructed with a bot's
  `Client` and an options object (prefix, owners, security mode, ...);
  exposes `onMessageCreated` / `onInteractionCreate` for the host bot to wire
  into its own event listeners.
- **`src/cli.ts`** — the separate `djsk create` CLI (`src/cli/`) that
  scaffolds a new bot/selfbot project. Unrelated to the runtime toolkit;
  ships in the same package for distribution convenience.

## Runtime pieces

- **`src/commands/`** — one file per subcommand (`js.ts`, `cjs.ts`, `mjs.ts`,
  `shell.ts`, `filesystem.ts` for `cat`/`curl`, `dm.ts`, `say.ts`,
  `restart.ts`, `update.ts`, ...), registered via `src/commands/registry.ts`
  and dispatched from `src/commands/root.ts`.
- **`src/context.ts`** — the reply/output abstraction all commands go
  through (pagination, codeblock formatting), so text commands and slash
  commands share one rendering path.
- **`src/owners.ts`** — `OwnerResolver`: decides who's allowed to invoke
  `jsk` at all (see [SECURITY.md](./SECURITY.md)).
- **`src/security.ts`** — `SecretScrubber` and the outbound-payload guarding
  used by security mode.
- **`src/prototype-guard.ts`** — hardens the `jsk js`/`jsk cjs` eval sandbox
  against prototype-pollution-style escapes.
- **`src/slash.ts`** — builds the `/jsk <subcommand>` slash command payload
  (`getSlashCommandData`) from the same command registry as the text
  commands.
- **`src/util/`** — output formatting, pagination, shell-output decoding,
  and version-check (`meta.ts`) helpers.

## How it's consumed

This repo is built as a workspace member of the root `sarp-project`
package.json, then copied into `sarp-utilities`' Docker build (see
`sarp-utilities/Dockerfile`, `npm run build:djsko`) and imported directly:

```ts
import { Jishaku } from "djsko";
const jsk = new Jishaku(client, { owners: [...], shellOwners: [...] });
client.on("messageCreate", (m) => jsk.onMessageCreated(m));
```

It's also published to npm as `djsk` (see the README badges) for use outside
this monorepo — the two consumption paths (workspace source vs. published
package) share the same code, just different install/build steps.

## Build & test

```bash
pnpm build       # tsup -> dist (ESM + CJS + d.ts)
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest (see *.test.ts next to the source files they cover)
```
