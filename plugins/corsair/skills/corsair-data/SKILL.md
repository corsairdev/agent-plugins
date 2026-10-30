---
name: corsair-data
description: Use when answering a question from the user's connected apps through Corsair (find a message, summarize recent emails, check a calendar, look up an issue) or doing something in an app right now (send, create, update). Explains when to search synced data with search, read live with read_data, and make changes with run_script.
---

# Read and act on connected apps

Three Corsair tools reach the user's data:

| | `search` | `read_data` | `run_script` |
| --- | --- | --- | --- |
| Reads | Data Corsair has already synced (Slack messages, Gmail, Calendar and so on) | The app's live API | The app's live API |
| Writes | No | No: the script stops at the first write, before that write runs | Yes: send, create, update, delete |
| Best for | Finding things ("what did Sarah say about the refund?") | Current state and exact lists | Any change |

Start with `search` when the user is looking for something. Use `read_data` when they need the current state or a complete list (every open issue, today's events). Use `run_script` only to change something. If this connection has neither `read_data` nor `run_script`, it can't reach apps live: answer from `search` and say so.

## search

Call it once with the whole question in `query`. Matching is by keyword with stemming, then ranked, not by meaning. So:

- Put synonyms in `keywords`. For "refund requests": `keywords: ["refund", "chargeback", "money back"]`.
- Put people, emails, channels, repos, projects and companies in `about`, not in `query`. `about: ["Sarah Chen"]` also matches messages she wrote.
- Put time limits in `after` and `before` as ISO timestamps, not in `query`. Work out the dates from today's date first.
- Narrow with `apps` (`["slack", "gmail"]`) and `kinds` (`["messages"]`) when you know where the answer lives.
- For the newest items ("my latest emails"), set `sort: "recent"`.

The reply has a sync line: which apps are synced and how recently.

- When it covers every app in the question, answer from the results.
- When it doesn't, it names the live call to run for each app it misses. Run those together in one `read_data`.

Each result shows its app, date, title, the text that matched and an id of the form `app:kind:id`, such as `github:issues:5125830691`. If you only see the structured result, build it from the hit's `pointer`: `plugin:entityType:entityId`. Often the results are enough to answer. When they aren't, such as to read a whole email, document or meeting notes, call `search` again with the ids:

- Pass up to 20 of them in `ids`.
- Long text comes in pages, and the reply says when there is more. With one id, ask for the next one with `page`.
- This reads Corsair's synced copy, not the app, so it answers fast. For the current state, use `read_data`.

No match means nothing in the synced copy matched. It doesn't mean the thing doesn't exist. Try other keywords, then a live read with `read_data`.

## read_data and run_script

Both take the same code: the body of an async function. `corsair` is the only thing in scope, and you `return` the result. There is no network, filesystem or `import`. A script has 25 seconds, so fetch only what the answer needs and run independent calls together with `Promise.all`.

1. Find the action: `list_operations {"integrations": ["slack"]}`. It lists each app's actions with their risk and required arguments.
2. Get its full arguments when you need more than that: `get_schema {"operations": ["slack.api.messages.post"]}`. Don't guess argument names.
3. Run it: reads with `read_data`, changes with `run_script`. Do the lookup and the action in one `run_script` call with ordinary JS rather than several round trips:

```js
const { channels = [] } = await corsair.slack.api.channels.list({});
const ships = channels.find((c) => c.name === 'ships');
if (!ships) return 'No #ships channel';
return await corsair.slack.api.messages.post({ channel: ships.id, text: 'Deploy finished' });
```

- Return only what answers the question. Map large responses down to the fields you need; very long results are cut short in the text you get back.
- Change something only when the user asked for that change. If they didn't say exactly what gets sent or changed, or the change messages other people, deletes, or touches many records, say what you'll do and wait for a yes.
- If `read_data` stops because the script reached a write, don't rerun it with `run_script` unless the user asked for that change.
- If the script fails, read the error:
  - "is not connected": connect the app first (see corsair-connect-apps), then run it again.
  - "Approval required", "requires user approval", "was denied", "timed out waiting for approval", or "is blocked by permission mode": see corsair-approvals.
  - A rejected argument: check the operation with `get_schema` again and fix the call.
- A script that fails partway has already made the changes before the failing line. Rerun only the part that didn't happen.
- If a reply says the fault is on Corsair's side, tell the user what it said and stop. Retrying or reconnecting won't help.

## Doing it later instead of now

`run_script` does the work once, now. For something that should happen every time an event occurs or on a schedule, use `update_routine` (see corsair-automations).
