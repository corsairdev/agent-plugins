---
name: corsair-workspace
description: Use when the user wants to track work or customers in Corsair (file, update or list issues and projects in Corsair's PM; add and update people, companies, deals, notes and tasks in Corsair's CRM), query or change one of their Postgres databases through Corsair's pg, or find and read a Mate chat. Gives the action names and the usual lookups.
---

# Corsair's own apps

Every Corsair link comes with apps of Corsair's own. Their data lives in Corsair, so they work without any other app connected. This skill covers PM, CRM, pg and Mate chats; Files, where the user's files live, has its own skill, corsair-files.

- **PM** (`pm`): teams, projects, issues with a status, priority, assignee, labels and a due date, plus comments.
- **CRM** (`crm`): people, companies and deals. A deal has a stage (Lead, In Progress, Won, Lost), a value, an owner and linked people and company. Any record can have notes and tasks.
- **pg** (`pg`): the user's own Postgres databases, queried by name. The connection URL stays in Corsair; you never see it.
- **Mate** (`assistant`): the chat assistant built into Corsair. You can find and read its chats.

Find what's there with `search` first ("what's open for the Kestrel pilot?" finds the deal, its notes and tasks, and the PM issues that name it). Use `read_data` for complete lists and `run_script` for changes, as the corsair-data skill explains.

## PM

| To | Action |
| --- | --- |
| Look up teams, states, people, labels, projects | `pm.db.teams.search`, `pm.db.workflowStates.search`, `pm.db.users.search`, `pm.db.issueLabels.search`, `pm.db.projects.search` |
| List or find issues | `pm.db.issues.search` (filter on `title`, `stateId`, `assigneeId`, `projectId`, `dueDate`) |
| File an issue | `pm.api.issues.create`: `title`, and optionally `stateId`, `priority` (1 urgent, 2 high, 3 medium, 4 low), `assigneeId`, `dueDate` (YYYY-MM-DD), `projectId`, `labelIds` |
| Change an issue | `pm.api.issues.update` with the issue's `id` |
| Comment | `pm.api.comments.create` |

Ids come from the lookups, never from names: look up the state, label, project and member first, in the same script.

```js
const [states, labels, projects, users] = await Promise.all([
  corsair.pm.db.workflowStates.search({ limit: 50 }),
  corsair.pm.db.issueLabels.search({ limit: 50 }),
  corsair.pm.db.projects.search({ limit: 50 }),
  corsair.pm.db.users.search({ limit: 50 }),
]);
const todo = states.find((s) => s.name === 'Todo');
const bug = labels.find((l) => l.name === 'Bug');
const relaunch = projects.find((p) => p.name === 'Website relaunch');
return await corsair.pm.api.issues.create({
  title: 'Checkout button does nothing in Safari',
  stateId: todo?.id, priority: 1, labelIds: bug ? [bug.id] : [], projectId: relaunch?.id,
  assigneeId: users[0]?.id, dueDate: '2026-11-21',
});
```

## CRM

| To | Action |
| --- | --- |
| Find records | `crm.api.records.query` with `object` (`people`, `companies`, `deals`), and `q` for text or `filter` such as `{ stage: 'Lead' }` |
| Add a record | `crm.api.records.create` with `object` and `values` (attribute slugs from `crm.api.attributes.list`) |
| Change a record | `crm.api.records.patch` with `object`, `record_id`, `values`; a deal's stage takes the stage's title |
| Notes | `crm.api.notes.create` with `record_id`, `title`, `content` |
| Tasks | `crm.api.tasks.create` with `content`, `deadline`, `linked_records` |

A record's values come back as lists of dated values; the current one has `active_until: null`.

Moving a deal to Won or Lost, or deleting anything, changes the user's records: say what you'll change and do it only when they asked for it.

## pg

| To | Action |
| --- | --- |
| See the databases and your access | `pg.api.dbs.list`: each has a `name`, your `access` (owner, write or read) and `read_only` |
| Read | `pg.api.query.sql` with `db` (the name), one statement in `sql`, and `params` for `$1`, `$2`, … It runs in a transaction that is always rolled back. Up to 1,000 rows; `truncated` says when it cut |
| Change data or tables | `pg.api.query.exec` with the same arguments. It commits, and needs write access on a database that isn't `read_only` |
| Add a database | `pg.api.dbs.create` with a lowercase `name`. It returns a `setup_url`: give it to the user exactly as returned, and the workspace owner pastes the connection URL there. Never ask for a connection URL or pass one yourself |
| Remove a database | `pg.api.dbs.remove` (owner only) |

- Look up the tables before you write SQL: `select table_name, column_name, data_type from information_schema.columns where table_schema = 'public'`.
- Put values in `params`, never into the SQL text.
- Reads go in `read_data` and `query.exec` in `run_script`. `query.exec` changes the user's database, so run it only for a change they asked for. Before an UPDATE or DELETE without a narrow WHERE, a DROP or a migration, show the statement and wait for a yes.
- Each member gets 10 queries per 10 seconds per database. Over a limit, the error says how many seconds to wait.

## Mate chats

`assistant.db.chats.search` finds chats (filter on `title`, `shared` or `updatedAt`), and `assistant.api.chats.get` with a chat's `id` returns its messages, oldest first. That includes chats in Shared, where each message also says who wrote it. `assistant.api.chats.rename`, `chats.move` and `chats.delete` change a chat; do that only when the user asks.
