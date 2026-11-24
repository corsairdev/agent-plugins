# Corsair for OpenClaw

Work in [Corsair](https://corsair.dev) from OpenClaw: track issues in Corsair's PM, keep people, companies and deals in its CRM, query your Postgres databases, use the other apps you've connected (Gmail, Slack, Linear, GitHub, Notion and more), hand files to them, search across all of them, work through your list of what needs doing, and set up automations that run on app events or a schedule.

The plugin adds Corsair's hosted MCP server, `https://mcp.corsair.dev/mcp`, and eight skills:

| Skill | Covers |
| --- | --- |
| `corsair-workspace` | Corsair's own apps: filing and updating issues in its PM, keeping people, companies, deals, notes and tasks in its CRM, querying the user's Postgres databases through pg, and reading Agent chats |
| `corsair-items` | The user's list of what needs doing: reading it, adding to it, and claiming an item, working it and reporting back with a pull request or a note |
| `corsair-connect-apps` | Finding an app, handing over its sign-in link, and confirming the connection |
| `corsair-files` | Getting a file into Corsair's Files from a chat, a URL or the user's machine, handing it to an app by its id, and reading, editing and saving files |
| `corsair-data` | When to search synced data, read an app live, make a change or wait on a long job; what apps on Corsair's account cost; when to send Corsair feedback |
| `corsair-automations` | Building automations from plain English or exact steps, then checking their runs |
| `corsair-approvals` | Permission modes, and what to do when an action needs approval |
| `corsair-skills` | Loading the user's saved skills, finding new ones on skills.sh, and saving or uploading skills so every agent on the link has them |

## Install

```bash
openclaw plugins install clawhub:@corsairdev/corsair
openclaw plugins enable corsair
```

OpenClaw installs it turned off; `enable` turns it on. Then sign in: in the Control UI, open **Settings > Plugins > corsair** and select **Sign in** next to the `corsair` account. A browser tab opens on Corsair; pick the link (the set of apps) to connect and approve. The page shows **Connected** when it's done. Start a new session so the tools load.

The eight skills load right away. Corsair's tools reach the agent as `corsair` MCP tools once you've signed in.

The same plugin installs in Claude Code, Codex, Cursor, Gemini CLI and Hermes Agent: see [corsairdev/agent-plugins](https://github.com/corsairdev/agent-plugins).

## What the plugin does on your machine and the network

- It connects to `https://mcp.corsair.dev/mcp` over HTTPS and sends Corsair the requests you make. Corsair reads and acts in the apps you've connected to your Corsair account, with the access you gave each app when you connected it.
- Some apps run on Corsair's own account and bill each call to your Corsair credits. `list_operations` shows each action's price; when credits run out, the call doesn't run.
- To upload a file from your machine, `upload_file` returns a short-lived upload link, and the corsair-files skill gives the `curl` command that sends that one file to it. `save_skill` with a folder works the same way, with a `tar | curl` command in the corsair-skills skill. The commands are written out in the skills; Corsair's reply only fills in the link. The skills tell the agent to run them only when you ask, and OpenClaw's own exec approvals still apply.
- `use_skill` returns skills from your Corsair library: ones you saved, or imported from GitHub or skills.sh when you asked.
- When you ask for something Corsair can't do (an app or action it doesn't have), or a reply says a fault is on Corsair's side, the corsair-data skill has the agent send the Corsair team a short note with `submit_feedback` and then tell you it sent one. For a wrong or confusing answer, it asks you first. The note is in the agent's own words: what you wanted, which tool, what went wrong. It never includes anything read from your apps (message or file contents, names, email addresses, phone numbers) or any key. These notes go to Corsair, the same service the plugin connects to, and nowhere else.
- `claim_item` and `report_result` record which agent is working an item and how it went, on your own list of items in your Corsair account.
- The plugin itself is a manifest, an MCP connection and Markdown skills. It runs no local code or background process, reads no credential files, and sends no telemetry or usage data of its own. OpenClaw holds the sign-in token.

Questions or problems: email [primary@corsair.dev](mailto:primary@corsair.dev).

[Privacy policy](https://corsair.dev/privacy-policy) · [Terms](https://corsair.dev/terms-of-service)
