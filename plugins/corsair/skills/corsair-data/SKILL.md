---
name: corsair-data
description: Use when answering a question from the user's Corsair workspace or connected apps (find a message, summarize recent emails, check a calendar, look up an issue, a deal or a note in Corsair's PM or CRM) or doing something in an app right now (send, create, update). Explains when to search synced data with search, read live with read_data, make changes with run_script, wait on long jobs with get_job, what apps on Corsair's account cost, and when to send submit_feedback.
---

# Read and act on connected apps

Three Corsair tools reach the user's data:

| | `search` | `read_data` | `run_script` |
| --- | --- | --- | --- |
| Reads | Corsair's own PM, CRM, routines and files, and data Corsair has synced from connected apps (Slack messages, Gmail, Calendar and so on). When an app's synced copy is behind, it reads that app live itself | The app's live API | The app's live API |
| Writes | No | No: the script stops at the first write, before that write runs | Yes: send, create, update, delete |
| Best for | Finding things ("what did Sarah say about the refund?") | Current state and exact lists | Any change |

Start with `search` when the user is looking for something. Use `read_data` when they need the current state or a complete list (every open issue, today's events). Use `run_script` only to change something. If this connection has neither `read_data` nor `run_script`, it can't reach apps live: answer from `search` and say so.

## search

Call it once with the whole question in `query`, in the user's words, and pass `timeZone` (the user's IANA zone, such as `Asia/Kolkata`) when you know it, so "today" and "this week" follow their calendar. Search works out who, what and when from the question itself ("what did pranay merge this week", "unread today", "what needs my reply", "issues assigned to me", "ENG-25"), so you don't set filters. A first name or handle finds that person in every app: "pranay" finds PranayHaldiya.

- Search matches words and can't negate them, so leave "not", "except", "without" and "excluding" out of `query`. For a "not X" question, use `sort: "recent"`, a larger `limit` such as 50 and `after` at the start of the day, then leave out X yourself.
- `keywords` adds synonyms when the records may use another word. For "refund requests": `keywords: ["chargeback", "money back"]`.
- For the newest items ("my latest emails"), set `sort: "recent"`. The default ranks by relevance.

What the reply holds:

- Each hit shows its app, date, title, the text that matched and an id of the form `app:kind:id`, such as `github:issues:5125830691`. If you only see the structured result, build it from the hit's `pointer`: `plugin:entityType:entityId`.
- When an app's synced copy was behind, search read that app live and put those rows among the hits. You don't need a separate live read for it.
- `coverage` says how far back search looked in each app and what it couldn't cover, such as records without a date.
- When no record answers the question, the reply says nothing matched (`answerable: false` in `coverage`) and lists a few `near_misses`. Don't present those as the answer: say nothing matched, and mention what came closest only as that.
- An app Corsair can't search comes back named, with a `read_data` snippet that looks in it. Run those snippets together in one `read_data`.

Often the hits are enough to answer. When they aren't, such as to read a whole email, document or meeting notes, call `search` again with the ids:

- Pass up to 20 of them in `ids`.
- Long text comes in pages, and the reply says when there is more. With one id, ask for the next one with `page`.
- This reads Corsair's synced copy, not the app, so it answers fast. For the current state, use `read_data`.

Nothing matched doesn't mean the thing doesn't exist. If `coverage` shows search didn't look back far enough, read the app with `read_data`.

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

- An app can be signed in with more than one account; `list_integrations` names each. Pick one with `{ as: "<account>" }` as the call's second argument, such as `corsair.gmail.api.messages.list({}, { as: 'work@acme.com' })`. When the user hasn't said which account, ask.
- An app that takes a file gets a Files id (`fil_…`) where it takes a file URL, never the file's bytes or base64. See corsair-files to get the file in first.
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
- If not, the reply says it "is still running" and gives a `job` handle such as `firecrawl:crawl.get:<id>`. Call `get_job` with that `job`. It waits 5 seconds by default (`wait`, up to 20; 0 only checks) and returns `status`: `completed` with the `result`, `failed`, or still `running`. Still running means call `get_job` again later; don't loop on it in one turn for minutes.
- Pass the handle exactly as given. Don't build one yourself: `get_job` only takes handles from Corsair replies.
- The reply also gives `read`, a `read_data` snippet that reads the job directly, and `cancel` where the app can stop it, a `run_script` snippet. Stop a job only when the user asks.
- A result too large for `get_job` says so; read it in parts with the `read` snippet.
- In a chat that shows Corsair's cards, `get_job` shows a job card that keeps checking until the job ends and offers **Continue**. Tell the user they can watch it there, and stop: another `get_job` only adds a second card.

This works whether the app uses the user's own account or Corsair's.

## Apps on Corsair's account

Some apps run on Corsair's own account and bill each call to the organization's Corsair credits; nothing to sign in to. For these:

- `list_operations` and `get_schema` give each action's price ("Price on Corsair's key: …"). An action tagged "not offered on Corsair's key" won't run there.
- `list_integrations` gives the balance under `corsair`: `credits_left`, `free_credits`, when free credits come back (`free_credits_reset_on`) and `spent_this_month`.
- A call that fails at the app is refunded. Long jobs hold credits up front and settle when the job ends.
- When credits run out or a spend limit is reached, the call doesn't run and nothing is charged. Tell the user what the reply says. It links to how credits work; don't send the user a link to buy credits yourself. Don't retry.

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
