#!/usr/bin/env node
// Copies the Corsair SDK skill from corsairdev/corsair into plugins/corsair-sdk.
//
// The skill is written in corsairdev/corsair (skills/corsair), next to the SDK
// it describes, so an SDK change and its skill change land in one PR. This repo
// carries a copy. .github/workflows/sync-corsair-skill.yml runs this daily; by
// hand, from a corsair checkout:
//
//   node scripts/sync-corsair-skill.mjs --from ../corsair/skills/corsair --commit <sha>
//
// When the copy changes, the corsair-sdk plugin's patch version goes up in both
// manifests, because clients decide whether to update by version.

import {
  appendFileSync,
  cpSync,
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEST = join(ROOT, "plugins/corsair-sdk/skills/corsair");
const RECORD = join(ROOT, "sync/corsair-skill.json");
const MANIFESTS = [
  "plugins/corsair-sdk/plugin.json",
  "plugins/corsair-sdk/.claude-plugin/plugin.json",
].map((p) => join(ROOT, p));

const { values } = parseArgs({
  options: {
    from: { type: "string" },
    commit: { type: "string" },
    ref: { type: "string", default: "main" },
  },
});
if (!values.from || !existsSync(join(values.from, "SKILL.md"))) {
  console.error("--from must be a skills/corsair directory containing SKILL.md");
  process.exit(2);
}

// Relative path -> contents, for every file under dir. Refuses symlinks, which
// Agent Plugins clients skip when they point outside the plugin.
function snapshot(dir) {
  const out = new Map();
  if (!existsSync(dir)) return out;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = lstatSync(p);
      if (st.isSymbolicLink()) throw new Error(`symlink in skill: ${p}`);
      if (st.isDirectory()) walk(p);
      else out.set(relative(dir, p), readFileSync(p));
    }
  };
  walk(dir);
  return out;
}

const source = snapshot(values.from);
const current = snapshot(DEST);
const same =
  source.size === current.size &&
  [...source].every(([p, buf]) => current.get(p)?.equals(buf));

const output = (key, value) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};

if (same) {
  console.log("corsair skill: unchanged");
  output("changed", "false");
  process.exit(0);
}

rmSync(DEST, { recursive: true, force: true });
cpSync(values.from, DEST, { recursive: true });

// Edit the version line in place, so a sync PR's diff is the skill and one line
// per manifest, not a reformatted file.
const VERSION = /"version":\s*"(\d+)\.(\d+)\.(\d+)"/;
const texts = MANIFESTS.map((p) => readFileSync(p, "utf8"));
const found = texts.map((t, i) => {
  const m = t.match(VERSION);
  if (!m) throw new Error(`no version in ${MANIFESTS[i]}`);
  return m;
});
if (new Set(found.map((m) => m[0])).size !== 1) {
  throw new Error(`corsair-sdk manifests disagree on version: ${found.map((m) => m[0])}`);
}
const [, major, minor, patch] = found[0].map(Number);
const version = `${major}.${minor}.${patch + 1}`;
MANIFESTS.forEach((p, i) => {
  writeFileSync(p, texts[i].replace(VERSION, `"version": "${version}"`));
});

const record = {
  repository: "corsairdev/corsair",
  path: "skills/corsair",
  ref: values.ref,
  commit: values.commit ?? null,
};
writeFileSync(RECORD, `${JSON.stringify(record, null, 2)}\n`);

console.log(`corsair skill: synced ${source.size} file(s), plugin version ${version}`);
output("changed", "true");
output("version", version);
