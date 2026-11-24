---
name: corsair-files
description: Use when the user wants one of their apps to work on a file through Corsair (parse a PDF, read a scan, transcribe audio, attach a document to an email or a record) or attaches a file in chat, points at a file on their machine or a URL, or asks what's in their Corsair Files. Explains getting a file in with upload_file, passing its id to an app in a script, reading and editing text files, and saving an app's output as a file.
---

# Files

Every Corsair link has Files, Corsair's own place for the user's files, up to 25 MB each. A script can't carry a file: its arguments are JSON and it has no network. So a file goes into Files first, and scripts pass its id (`fil_…`).

Never paste a file's bytes or base64 into a script or a tool argument.

## Get the file in

`upload_file` adds a file and returns its id. Pass one of these:

| You have | Pass | What happens |
| --- | --- | --- |
| A file the user attached in ChatGPT | `file` | Corsair fetches it and saves it |
| A public https address | `url` | Corsair fetches it and saves it |
| A file somewhere you can run shell commands: the user's machine, or your code sandbox | `path` | Nothing is saved yet. The reply gives a `curl` command; run it and it sends the file straight to Files and prints the id. Don't read or paste the file yourself |
| None of these | nothing | The reply gives an upload link that works for 10 minutes. Where the chat shows Corsair's card, the user picks the file there and presses Continue; tell them to use the card rather than repeating the link |

- In claude.ai, a file the user attached sits in your code sandbox under `/mnt/user-data/uploads/`. Pass that path as `path` and run the command in the sandbox. Corsair keeps the file's own name. For other temporary copies (a hash for a name), pass `name` with the name the user's file had.
- If the network refuses Corsair's address, don't retry and don't call `upload_file` again. The user picks the file from the card or link instead.
- Once that file is saved, tell the user once how to skip the picker next time: in claude.ai, add `auth.corsair.dev` (the host in the upload link) under **Settings > Capabilities > Allowed websites**. After that, the command sends their attachments straight from the chat. If the reply names a different host, give that one.
- `folder` puts the file in a folder, like `contracts/2026`.
- `upload_file` only adds files. It never changes or replaces a file already in Files, and the same file sent twice stays one file with one id.

## Hand it to an app

Pass the id wherever the app takes a file URL. Before the call reaches the app, Corsair swaps the id for a short-lived link to the file:

```js
return await corsair.reducto.api.parse.parse({ input: 'fil_8Kq2xVn4' });
```

`{ file_id: 'fil_…' }` in that place works too. When you need the link itself, for example to give the user a download link, `corsair.files.api.files.url({ file_id })` returns one that works for 15 minutes (`minutes`, up to 60).

## Files an app returns

When an action returns a file, such as a Drive download, an email attachment or an export, Corsair saves it to Files under `downloads/<app>` and puts its id (`fileId`) in the result. A file over 700 KB comes back as the id alone; a smaller one has its content beside the id.

- As the call's second argument, `{ save: 'contracts' }` saves it to that folder instead, and `{ save: false }` skips saving.
- A scan or photo saved without a folder is read only when you use it: `files.api.files.read_text`, or `files.api.files.reparse` to read it again. Saved to a folder, it's read when it arrives.
- Hand the id to another app the same way as an uploaded file.

## Read, change and keep files

| To | Action |
| --- | --- |
| List files and folders | `files.api.files.list`, with `folder` or `query` (part of a name) |
| See one file's name, type and size | `files.api.files.get` |
| Read a text file (text, markdown, CSV, JSON) or a PDF's text | `files.api.files.read_text`: 40,000 characters at a time; read on from `next_offset` until it's null. A scanned PDF has no text to read, so send it to a parser app |
| Save text as a new file, such as a summary or a parsed document | `files.api.files.write_text` with `name` and `text`, up to 1 MB |
| Change part of a text file | `files.api.files.edit_text` with `old_text` (copied from `read_text`, enough to match once) and `new_text` |
| Save an app's output, such as an edited image or a filled-in PDF | `files.api.files.save_from_url` with the `url` the app returned. With `file_id` it becomes that file's new version instead of a new file |
| Rename, move, share, or give search a file's text | `files.api.files.update` |
| Delete | `files.api.files.delete` |

These run like any other action: reads in `read_data`, changes in `run_script` (see corsair-data).

- A file is private to the link that added it. `files.api.files.update` with `shared: true` lets everyone in the workspace read it. Only the link that added a file can change, share or delete it.
- A new version, an `edit_text` or a delete replaces what the file said, and the user can't get the old content back. Do it only when the user asked for that file to change.
- To find a file, call `search` with its name or what it says and `apps: ["files"]`, or list with `files.api.files.list` and `query` (part of the name). Search reads a file's text when it has some (text files, and PDFs with a text layer). For a scan, pass the parser's output as `text` to `files.api.files.update`, and search can find it from then on.

## Example: parse an attached PDF and keep the result

1. `upload_file` with the attachment (`file` in ChatGPT, `path` in claude.ai). It returns `fil_8Kq2xVn4`.
2. One `run_script`:

```js
const { result } = await corsair.reducto.api.parse.parse({ input: 'fil_8Kq2xVn4' });
// A long document comes back as a link to the result rather than the chunks.
if (result.type === 'url') {
  return await corsair.files.api.files.save_from_url({ url: result.url, name: 'contract-parsed.json', folder: 'contracts' });
}
const text = result.chunks.map((c) => c.content).join('\n\n');
await corsair.files.api.files.update({ file_id: 'fil_8Kq2xVn4', text });
return await corsair.files.api.files.write_text({ name: 'contract-parsed.md', text, folder: 'contracts' });
```

Check an app's return shape with `get_schema` before mapping it.
