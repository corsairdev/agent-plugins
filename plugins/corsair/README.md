# Corsair

Work in [Corsair](https://corsair.dev) from your agent: track issues in Corsair's PM, keep people, companies and deals in its CRM, query your Postgres databases, use the other apps you've connected, hand files to them, search across all of them, work through your list of what needs doing, and set up automations that run on app events or a schedule.

The plugin adds the Corsair MCP server, `https://mcp.corsair.dev/mcp`, and eight skills:

| Skill | Covers |
| --- | --- |
| `corsair-workspace` | Corsair's own apps: filing and updating issues in its PM, keeping people, companies, deals, notes and tasks in its CRM, querying the user's Postgres databases through pg, and reading Agent chats |
| `corsair-items` | The user's list of what needs doing: reading it, adding to it, and claiming an item, working it and reporting back with a pull request or a note |
| `corsair-connect-apps` | Finding an app, handing over its sign-in link or pointing to the Connect button on Corsair's card, and confirming the connection |
| `corsair-files` | Getting a file into Corsair's Files from a chat, a URL or the user's machine, handing it to an app by its id, and reading, editing and saving files |
| `corsair-data` | When to search synced data, read an app live, make a change or wait on a long job; what apps on Corsair's account cost; when to send Corsair feedback |
| `corsair-automations` | Building automations from plain English or exact steps, then checking their runs |
| `corsair-approvals` | Permission modes, and what to do when an action needs approval |
| `corsair-skills` | Loading the user's saved skills, finding new ones on skills.sh, and saving or uploading skills so every agent on the link has them |

## Install

In Claude Code:

```
/plugin marketplace add corsairdev/agent-plugins
/plugin install corsair@corsair
```

Other clients: see the [repo README](https://github.com/corsairdev/agent-plugins#install).

The first time your client connects, it asks you to sign in to Corsair and approve the connection.

### Hermes Agent

```bash
hermes plugins install corsair
hermes plugins enable corsair
```

Hermes installs plugins turned off; `enable` turns it on in the profile you chat from.

Corsair signs you in with OAuth, and Hermes runs OAuth only for servers listed in your profile's `config.yaml`. Add this entry. It takes the place of the plugin's `corsair` server, so keep `trust: untrusted` in it:

```yaml
mcp_servers:
  corsair:
    url: https://mcp.corsair.dev/mcp
    auth: oauth
    trust: untrusted
```

Then sign in once from a terminal, in the same profile:

```bash
hermes mcp login corsair
```

Hermes stores and refreshes the sign-in. Cron jobs and the messaging gateway can't open a browser, so sign in before you use Corsair from them.

The `corsair` server is marked `trust: untrusted`, so Hermes asks before each tool that changes something: `run_script` (sending, creating or updating in your apps), `update_routine`, `upload_file`, `save_skill`, `create_item`, `claim_item`, `report_result`, `get_connect_link` and `submit_feedback`. Searching and reading run without asking. Hermes loads the skills as `corsair:<skill>`, for example `corsair:corsair-data`.

## What the plugin does on your machine and the network

- It connects to `https://mcp.corsair.dev/mcp` over HTTPS and sends Corsair the requests you make. Corsair reads and acts in the apps you've connected to your Corsair account, with the access you gave each app when you connected it.
- Some apps run on Corsair's own account and bill each call to your Corsair credits. `list_operations` shows each action's price; when credits run out, the call doesn't run.
- To upload a file from your machine, `upload_file` returns a `curl` command that sends that one file to your Corsair Files, and `save_skill` with a folder returns a command that uploads the skills in that folder. The skills tell the agent to run them only when you ask, and your client's own shell permissions still apply.
- `use_skill` returns skills from your Corsair library: ones you saved, or imported from GitHub or skills.sh when you asked.
- The plugin itself is a manifest, an MCP connection and Markdown skills. It runs no local code or background process, reads no credential files and sends no telemetry. Your client holds the sign-in token.

Questions or problems: email [primary@corsair.dev](mailto:primary@corsair.dev).

[Privacy policy](https://corsair.dev/privacy-policy) · [Terms](https://corsair.dev/terms-of-service)
