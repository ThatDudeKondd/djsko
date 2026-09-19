# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/). This file
was started at `0.5.0`; earlier releases (`0.1.0`–`0.4.0`) predate it — see
[GitHub Releases](https://github.com/otnc/djsk/releases) or `git log
v0.4.0..HEAD` for that history.

## [Unreleased]

## [0.5.0]

### Fixed

- Eval cleanup ordering, a `child_process` timeout bypass, and listener
  leaks around `jsk js`/`jsk cjs`/`jsk mjs` evals.
- `jsk mjs` now guards real static `import "node:child_process"` too, not
  just `require`/`dynamicImport`.

### Changed

- Bumped `engines.node` from `>=18` to `>=22`.

### Added

- The process now stays alive on an `uncaughtException`/`unhandledRejection`
  that escapes a `jsk` eval, instead of crashing the whole bot
  (`catchProcessErrors` option).
