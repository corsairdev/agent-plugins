# Corsair

Work in [Corsair](https://corsair.dev) from your agent: track issues in Corsair's PM, keep people, companies and deals in its CRM, use the other apps you've connected, search across all of them, and set up automations that run on app events or a schedule.

The plugin adds the Corsair MCP server, `https://mcp.corsair.dev/mcp`, and six skills:

| Skill | Covers |
| --- | --- |
| `corsair-workspace` | Corsair's own PM and CRM: filing and updating issues, and keeping people, companies, deals, notes and tasks |
| `corsair-connect-apps` | Finding an app, handing over its sign-in link or pointing to the Connect button on Corsair's card, and confirming the connection |
| `corsair-data` | When to search synced data, read an app live, make a change or wait on a long job; what apps on Corsair's account cost; when to send Corsair feedback |
| `corsair-automations` | Building automations from plain English or exact steps, then checking their runs |
| `corsair-approvals` | Permission modes, and what to do when an action needs approval |
| `corsair-skills` | Loading the user's saved skills, finding new ones on skills.sh, and saving or uploading skills so every agent on the link has them |

In Claude Code:

```
/plugin marketplace add corsairdev/agent-plugins
/plugin install corsair@corsair
```

Other clients: see the [repo README](../../README.md#install).

The first time your client connects, it asks you to sign in to Corsair and approve the connection.

Questions or problems: email [primary@corsair.dev](mailto:primary@corsair.dev).

[Privacy policy](https://corsair.dev/privacy-policy) · [Terms](https://corsair.dev/terms-of-service)
