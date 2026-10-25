# Corsair agent plugins

Plugins that install [Corsair](https://corsair.dev) into AI clients. One tree serves Claude Code, Cursor, Codex, VS Code, GitHub Copilot, Grok Bot, Gemini CLI and `npx skills`.

| Plugin | For | Contains |
| --- | --- | --- |
| [`corsair`](plugins/corsair) | People using their connected apps from an agent | The Corsair MCP server and four skills for using it |
| [`corsair-sdk`](plugins/corsair-sdk) | Developers adding the Corsair SDK to an app | The `corsair` setup skill and the Corsair docs MCP server |

## Install

```bash
# Claude Code
claude plugin marketplace add corsairdev/agent-plugins
claude plugin install corsair@corsair      # or corsair-sdk@corsair

# Codex
codex plugin marketplace add corsairdev/agent-plugins
codex plugin add corsair@corsair

# Gemini CLI (installs the Corsair MCP server)
gemini extensions install https://github.com/corsairdev/agent-plugins

# Any agent that reads Agent Skills
npx skills add corsairdev/agent-plugins
```

Cursor installs from the [Cursor Marketplace](https://cursor.com/marketplace) once the plugins are listed.

## Support

Email [primary@corsair.dev](mailto:primary@corsair.dev).

## Layout

```
.claude-plugin/marketplace.json     Claude Code marketplace
.cursor-plugin/marketplace.json     Cursor marketplace
.agents/plugins/marketplace.json    Codex marketplace
gemini-extension.json               Gemini CLI, which installs only from a repo root
plugins/<name>/
  plugin.json                       Agent Plugins 1.0 manifest: Cursor, Codex and ChatGPT, VS Code, Copilot, Grok Bot
                                    (extensions.com.openai holds the Codex and ChatGPT listing copy)
  .claude-plugin/plugin.json        Claude Code manifest, pointing mcpServers at ./mcp.json
  mcp.json                          the plugin's MCP server, read by every client above
  skills/<skill>/SKILL.md           Agent Skills, read by every client above
  assets/icon.png                   512×512 (the directory takes 512–2048 px)
plugins/corsair/server.json         MCP Registry entry, dev.corsair/mcp
sync/corsair-skill.json             which corsairdev/corsair commit the corsair skill came from
```

Keep every path inside its plugin folder. Claude Code rejects `..` paths, and Agent Plugins clients skip symlinks that leave the plugin.

The Corsair MCP URL can't be shared through one file, so it's written in `plugins/corsair/mcp.json`, `plugins/corsair/server.json` and `gemini-extension.json`. `scripts/check.mjs` fails if they differ.

## The corsair skill comes from corsairdev/corsair

The SDK setup skill lives next to the SDK, in [`corsairdev/corsair/skills/corsair`](https://github.com/corsairdev/corsair/tree/main/skills/corsair). That way an SDK change and its skill change land in one PR, and `npx skills add corsairdev/corsair` keeps working. This repo carries a copy in `plugins/corsair-sdk/skills/corsair`. **Edit the skill there, never here.** A sync would overwrite the change.

`.github/workflows/sync-corsair-skill.yml` keeps the copy current:

1. Every day, and on demand from the Actions tab, it checks out `skills/corsair` from corsairdev/corsair `main`. The repo is public, so this needs no token.
2. If the files differ from the copy, it replaces the copy, bumps the corsair-sdk plugin's patch version in both manifests, and records the source commit in `sync/corsair-skill.json`.
3. It runs `scripts/check.mjs`, then opens or updates one PR from the `sync/corsair-skill` branch. Merging that PR releases the update.

The PR step needs **Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"** turned on.

To sync right away instead of waiting a day, add this to corsairdev/corsair. It needs a token with Contents write on this repo, saved as `AGENT_PLUGINS_TOKEN`.

```yaml
# corsairdev/corsair: .github/workflows/notify-agent-plugins.yml
on:
  push:
    branches: [main]
    paths: [skills/corsair/**]
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: gh api repos/corsairdev/agent-plugins/dispatches -f event_type=corsair-skill-changed
        env:
          GH_TOKEN: ${{ secrets.AGENT_PLUGINS_TOKEN }}
```

To sync by hand from a local clone of corsairdev/corsair:

```bash
node scripts/sync-corsair-skill.mjs --from ../corsair/skills/corsair --commit "$(git -C ../corsair rev-parse HEAD)"
```

## Before you push

```bash
node scripts/check.mjs                 # cross-file checks
claude plugin validate .               # marketplace
claude plugin validate plugins/corsair
claude plugin validate plugins/corsair-sdk
```

CI (`.github/workflows/check.yml`) runs these and validates every `plugin.json` and `mcp.json` against the Agent Plugins schemas.

To release a change to a plugin, bump `version` in both of its manifests. For `corsair`, also bump it in `server.json` and `gemini-extension.json`. Clients decide whether to update by version.
