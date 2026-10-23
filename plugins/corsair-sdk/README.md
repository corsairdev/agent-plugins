# Corsair SDK

Set up the [Corsair](https://corsair.dev) SDK in a TypeScript app. Your users connect GitHub, Slack, Gmail and hundreds of other services, and Corsair handles OAuth, webhooks and agent access.

The plugin adds:

- **The `corsair` skill.** It plans the setup with you and wires the `/api/corsair` route for your framework. It doesn't stop until a real API call returns data.
- **The Corsair docs MCP server** at `https://docs.corsair.dev/mcp`. The agent searches the docs and reads full pages while it works, so it can look up any integration's actions and arguments instead of guessing them. It needs no sign-in.

In Claude Code:

```
/plugin install corsair-sdk --marketplace corsairdev/agent-plugins
```

Other clients: see the [repo README](../../README.md#install).

The skill is maintained next to the SDK in [corsairdev/corsair](https://github.com/corsairdev/corsair/tree/main/skills/corsair), and a daily job copies it here. To change it, open a PR there, not here.

To use your own connected apps from an agent rather than build with the SDK, install the `corsair` plugin instead.

Docs: [docs.corsair.dev](https://docs.corsair.dev)

[Privacy policy](https://corsair.dev/privacy-policy) · [Terms](https://corsair.dev/terms-of-service)
