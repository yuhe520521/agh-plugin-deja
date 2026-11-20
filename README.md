# Deja-vu Memory

English | 中文

## ① What it does

This plugin is the AGH Harness adapter for **deja-vu** — a local-first memory index that searches the session history of coding agents (Claude Code, Codex, Cursor, opencode, and 38 others) on this machine.

It provides tools to:
- **recall**: Search past sessions before debugging or re-implementing.
- **session**: Get a full digest of the best-matching past session.
- **blame**: Find past sessions that discussed a specific file.
- **fix**: See what this machine ran after encountering a specific error.
- **how**: Find the real invocation used for a build, test, or deploy.
- **remember**: Store a durable decision as a self-contained fact.
- **search**: General JSON-based session search.

## ② Installation

```sh
agh plugin add @agh-hub/deja-vu
```

## ③ Credentials & Configuration

This plugin requires the **deja** binary to be installed on the local machine. It does not require API keys or network access.

1. Install the deja binary:
   ```sh
   curl -fsSL https://raw.githubusercontent.com/vshulcz/deja-vu/main/install.sh | sh
   ```
2. Ensure the `deja` command is available in your `PATH`, or set the `DEJA_BIN` environment variable to point to the binary:
   ```sh
   export DEJA_BIN=/path/to/deja
   ```

## ④ Differences from Original Plugin

- **UI Removed**: The original plugin included a React-based UI panel (`client.js`) for the host's web interface. AGH does not support this UI mechanism; the panel, shortcuts, and slots are removed.
- **Auto-Recall Degraded**: The original plugin automatically injected recall context into the system prompt via `ctx.systemPrompt` and `agent/pre-step` hooks. In AGH, this is degraded to explicit tool calls — the model must call `agh_deja_recall` when it needs past context.
- **HTTP Route Removed**: The original `/api/deja-search` web route is removed and replaced by the `agh_deja_search` tool.
- **Commands Removed**: The original `/deja` command is removed, replaced by the `agh_deja_search` tool.