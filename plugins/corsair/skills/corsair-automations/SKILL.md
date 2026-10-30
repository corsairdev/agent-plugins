---
name: corsair-automations
description: Use when the user wants something to happen automatically through Corsair, either when an app event occurs ("when a Linear issue is marked Done, post it in Slack") or on a schedule ("every Monday at 9"), or asks whether an automation ran or why it failed, or wants to list, change, pause or switch off an automation. Covers update_routine and view_routines.
---

# Build and check Corsair automations

Corsair calls an automation a routine: a trigger (an app event or a clock) plus the steps that run when it fires. You describe it in plain words, and Corsair writes and tests the steps. You never pass code.

Saving one is half the job. The other half is confirming it fires and works, because a routine can save cleanly and still fail on its first real event.

## Before you add one

- Call `view_routines`. If something already watches the same event and does the same thing, tell the user instead of adding a second one.
- If there's no `update_routine` tool, this connection can't create or change routines. Tell the user. Don't do the routine's work yourself with `run_script` instead.
- Every app the routine uses has to be connected. If one isn't, connect it first (see the corsair-connect-apps skill).

## Create one

Call `update_routine` with only `intent`, written the way the user would say it, with the specifics: which app, which event, which channel or person, what the message says, and for a schedule, when and in which timezone.

```json
{ "intent": "When a Linear issue is marked Done, post its title in the #ships Slack channel." }
```

Corsair builds it in the background, so it doesn't exist yet when the call returns.

1. Wait briefly, then call `view_routines`. The build appears as "one you described is still being built" (`kind: "pending_build"`, `status` `queued` or `running`). Check a couple of times; if it's still building, tell the user and check later instead of polling in a loop.
2. If it "needs one question answered" (`status: "waiting_for_input"`), give the user its `question` and `options`. Send their choice back with `{"routine": "<the build's id>", "answer": "<the option exactly as listed>"}` and nothing else in the call. The build's id starts with `aj_`.
3. If it "could not be built" (`status: "failed"`), tell the user what its `error` says and offer to describe it differently.
4. Once it's built, read it back from `view_routines` and check it matches what the user meant.

## Change, pause or switch one off

`view_routines` gives each routine's id. A routine id starts with `wf_` ("Routine id wf_…"); an event routine also has a trigger id starting with `wft_`, and either one works below.

- **Change it:** call `update_routine` with that `routine` id and an `intent` describing the change. Corsair changes that routine instead of adding a second one.
- **Pause or resume it:** `{"routine": "<id>", "action": "pause"}`, or `"resume"`.
- **Switch it off:** `{"routine": "<id>", "action": "remove"}`. What it did stays saved in Corsair.

If two routines look alike, confirm which one with the user first.

## Check that it works

1. Ask the user to make the event happen, or tell them what to watch for. For a schedule, tell the user when the first run is due.
2. Call `view_routines` with `routine` to see its recent runs. Each has an id and a status: succeeded (`successful`), failed (`error`), still running (`running`), or needs approval before it can run (`awaiting_approval`, see corsair-approvals).
3. For a failed run, call `view_routines` with `run` to see its steps and the error. Describe the fix with `update_routine` (`routine` and `intent`), then check again.
4. No run at all means the trigger didn't match. Ask the user what happened in the app and describe the event more precisely.
5. If `view_routines` says nothing narrows a routine down, so it fires on every event of that kind, pass that warning on.

Don't tell the user a routine works until a run has succeeded.
