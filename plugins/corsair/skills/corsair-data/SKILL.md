---
name: corsair-data
description: Use when answering a question from the user's connected apps through Corsair (find a message, summarize recent emails, check a calendar, look up an issue) or doing something in an app right now (send, create, update). Explains when to search synced data with search, read live with read_data, make changes with run_script, wait on long jobs with get_job, what apps on Corsair's account cost, and when to send submit_feedback.
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

1. Find the action: `list_operations {"integrations": ["slack"], "search": "post a message"}`. With `search` it returns only the matching actions, each with its risk and required arguments, ready to use. Without `search` it lists every action's name and risk.
2. Call `get_schema {"operations": ["slack.api.messages.post"]}` when you need an action's return shape or its optional arguments. Don't guess argument names.
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
  - Credits ran out, "spend limit ... is used up", or "isn't offered on Corsair's own account": see "Apps on Corsair's account" below.
- A script that fails partway has already made the changes before the failing line. Rerun only the part that didn't happen.
- If a reply says the fault is on Corsair's side, tell the user what it said and stop. Retrying or reconnecting won't help. See "Telling Corsair about a problem" below.

## Long jobs

Some actions start work that outlasts one call: a site crawl, an async document parse, an agent run, an image or video prediction. Corsair notices the start, waits a few seconds, and returns the job:

- If it finished in that time, its result is in the reply, under `jobs` in the structured result.
- If not, the reply says it "is still running" and gives a `job` handle such as `firecrawl:crawl.get:<id>`. Call `get_job` with that `job`. It waits up to 20 seconds (`wait`, 0 to only check) and returns `status`: `completed` with the `result`, `failed`, or still `running`. Still running means call `get_job` again later; don't loop on it in one turn for minutes.
- Pass the handle exactly as given. Don't build one yourself: `get_job` only takes handles from Corsair replies.
- The reply also gives `read`, a `read_data` snippet that reads the job directly, and `cancel` where the app can stop it, a `run_script` snippet. Stop a job only when the user asks.
- A result too large for `get_job` says so; read it in parts with the `read` snippet.
- In a chat that shows Corsair's cards, `get_job` shows a job card that keeps checking until the job ends and offers **Continue**. Tell the user they can watch it there.

This works whether the app uses the user's own account or Corsair's.

## Apps on Corsair's account

Some apps run on Corsair's own account and bill each call to the organization's Corsair credits; nothing to sign in to. For these:

- `list_operations` and `get_schema` give each action's price ("Price on Corsair's key: …"). An action tagged "not offered on Corsair's key" won't run there.
- `list_integrations` gives the balance under `corsair`: `credits_left`, `spent_this_month`, when free credits come back, and `top_up_url`.
- A call that fails at the app is refunded. Long jobs hold credits up front and settle when the job ends.
- When credits run out or a spend limit is reached, the call doesn't run and nothing is charged. Tell the user what the reply says, including the top-up link if it gives one. Don't retry.

## Replies that need the user

A reply can end with `Needs you:` and a list: an app whose sign-in expired, Corsair credits running low, a routine run held for approval, a routine waiting on an answer. Pass each line on with the fix it names, even when it's unrelated to the question.

## Telling Corsair about a problem

`submit_feedback` sends the Corsair team a short note about Corsair itself: a tool that failed (`category: "failed"`), answered wrongly (`wrong_result`), an app or action Corsair lacks (`missing`), or something confusing (`confusing`).

- Send one on your own, once per issue, when the user asked for something Corsair can't do (an app or action it lacks) or a reply said the fault is on Corsair's side. Then tell the user in one line that you sent it.
- For a wrong or confusing answer, offer first and send only if the user agrees.
- Don't send one for the user's own mistake, an app's own refusal, or a limit working as intended (credits, approvals).
- Write `note` in your own words: what the user wanted, which tool, what happened. Never include anything read from the user's apps (message or file contents, names, email addresses, phone numbers) or any key.
- When the failed reply ended with `Ref: <code>`, pass that code as `ref`. Add `tool` and `integration` when you know them.
- People at Corsair read these, but nobody replies in the chat. If the call fails, don't retry it.

## Doing it later instead of now

`run_script` does the work once, now. For something that should happen every time an event occurs or on a schedule, use `update_routine` (see corsair-automations).
