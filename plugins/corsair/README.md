# Corsair

Use the apps you've connected in [Corsair](https://corsair.dev) from your agent: read and act on them, search synced data, and set up automations that run on app events or a schedule.

The plugin adds the Corsair MCP server, `https://mcp.corsair.cloud/mcp`, and four skills:

| Skill | Covers |
| --- | --- |
| `corsair-connect-apps` | Finding an app, handing over its sign-in link, and confirming the connection |
| `corsair-data` | When to search synced data, read an app live, or make a change |
| `corsair-automations` | Building automations from plain English or exact steps, then checking their runs |
| `corsair-approvals` | Permission modes, and what to do when an action needs approval |

In Claude Code:

```
/plugin marketplace add corsairdev/agent-plugins
/plugin install corsair@corsair
```

Other clients: see the [repo README](../../README.md#install).

The first time your client connects, it asks you to sign in to Corsair and approve the connection.

Questions or problems: email [primary@corsair.dev](mailto:primary@corsair.dev).

[Privacy policy](https://corsair.dev/privacy-policy) · [Terms](https://corsair.dev/terms-of-service)
