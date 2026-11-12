---
name: corsair-workspace
description: Use when the user wants to track work or customers in Corsair: file, update or list issues and projects in Corsair's PM, or add and update people, companies, deals, notes and tasks in Corsair's CRM. Gives the action names and the usual lookups for both.
---

# Corsair's PM and CRM

Every Corsair link comes with two apps of Corsair's own. Their data lives in Corsair, so they work without any other app connected.

- **PM** (`pm`): teams, projects, issues with a status, priority, assignee, labels and a due date, plus comments.
- **CRM** (`crm`): people, companies and deals. A deal has a stage (Lead, In Progress, Won, Lost), a value, an owner and linked people and company. Any record can have notes and tasks.

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
