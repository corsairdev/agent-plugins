---
name: corsair-skills
description: Use when the user wants to load, find, save or share agent skills through Corsair, such as "use my pr-review skill", "find me a skill for release notes", "save this as a skill", "add mattpocock/skills/tdd", or "upload my ~/.claude/skills so my other agents have them". Covers use_skill, find_skill and save_skill.
---

# Load, find and save skills

A skill is a set of instructions: a SKILL.md, sometimes with files it refers to. Corsair keeps the user's skills in their own Corsair instance, so every agent on the same link can load them, whichever client it runs in. The user manages them at hub.corsair.dev/me/skills.

The skill tools come on the links people make at hub.corsair.dev/me. If this connection has none of them, it has no skills; say so rather than guessing.

## Which skills there are

The server instructions end with a `Skills:` block: the user's skills, newest first, one line each with what it does. Clients that show MCP prompts also list each skill as a prompt under its name. Only the first 50 are listed, and any skill can still be loaded by name.

## use_skill

- `use_skill {"name": "pr-review"}` returns the SKILL.md, then the names of the files that come with it.
- Load a skill when the user names it or the task matches its description, then follow it as you would a skill installed locally.
- For one of its files, call again with `file`: `use_skill {"name": "pr-review", "file": "references/checklist.md"}`. Only names from the reply work.
- An unknown name, or a skill the user switched off, fails with the list of skills there are. Pick from that list.

## find_skill

- `find_skill {"query": "pr descriptions"}` searches the public skills.sh directory for skills the user hasn't saved. It returns up to 5, each with an id such as `mattpocock/skills/tdd`, what it does and how many installs it has.
- It saves nothing.
- In a chat that shows Corsair's cards, the results come in a skills card with an **Add** button on each. Tell the user to add one there.
- Without the card, the reply ends "Reply with a number to add it". When the user picks one, call `save_skill` with that result's id as `from`.
- Other people write the skills on skills.sh. Say where one comes from before saving it.

## save_skill

Saves a skill for every agent on this link, in one of three ways. Pass one, never two.

1. **Text.** `skill_md` holds the full SKILL.md, frontmatter included. Or pass `description` and `instructions` instead. Add `files` (path to text) for files that come with it. Leave out `name` and it is read from the frontmatter: lowercase letters, digits and hyphens. Saving the same name again adds a new version.
2. **Import.** `from` takes a GitHub URL, a skills.sh id or a skill's name. A bare name is searched on skills.sh. When several skills fit and none clearly leads, nothing is saved and the reply lists the candidates: ask the user which, then call again with `from: <id>`. A same-named skill from another source is kept as it is. Pass `overwrite: true` only when the user says to replace it.
3. **Folder.** `folder: "~/.claude/skills"` returns one shell command that uploads every skill in that folder from the user's machine. The files never pass through you, so don't read or paste them. Nothing is saved until the command runs.
   - With a shell, show the command and run it once the user agrees. Without one, give it to the user to paste into their terminal.
   - It prints one line per skill: created, updated, unchanged, skipped or failed. Pass those on.
   - The link in it works for 10 minutes. After that, call `save_skill` again for a new one.

- Save only what the user asked you to save.
- Corsair keeps only text files and removes keys and tokens it finds. The reply says what it removed; tell the user.
- A link in Read mode has `use_skill` and `find_skill` but no `save_skill`. The user can save from hub.corsair.dev/me/skills or change the link's mode there.
- A library holds up to 100 skills. One skill holds up to 200 files and 8 MB, with a SKILL.md up to 64 KB.
