#!/usr/bin/env node
// Cross-file checks that no client's validator makes: the three marketplaces
// list the same plugins, each plugin's two manifests agree, every skill's name
// matches its folder, and the Corsair MCP URL is the same everywhere it's written.
// `claude plugin validate` and the Agent Plugins schemas cover each file alone.

import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const problems = [];
const fail = (msg) => problems.push(msg);

function json(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    fail(`missing ${rel}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    fail(`${rel}: ${e.message}`);
    return null;
  }
}

// Marketplaces: same plugin names, sources inside the repo.
const claudeMarket = json(".claude-plugin/marketplace.json");
const cursorMarket = json(".cursor-plugin/marketplace.json");
const codexMarket = json(".agents/plugins/marketplace.json");
const entries = {
  claude: (claudeMarket?.plugins ?? []).map((p) => ({ name: p.name, source: p.source, description: p.description })),
  cursor: (cursorMarket?.plugins ?? []).map((p) => ({ name: p.name, source: p.source, description: p.description })),
  codex: (codexMarket?.plugins ?? []).map((p) => ({ name: p.name, source: p.source?.path })),
};
const names = (list) => list.map((e) => e.name).sort().join(",");
if (names(entries.claude) !== names(entries.cursor) || names(entries.claude) !== names(entries.codex)) {
  fail(`marketplaces list different plugins: claude=${names(entries.claude)} cursor=${names(entries.cursor)} codex=${names(entries.codex)}`);
}

const skillNames = new Map();
for (const [market, list] of Object.entries(entries)) {
  for (const { name, source } of list) {
    if (typeof source !== "string" || !source.startsWith("./plugins/") || source.includes("..")) {
      fail(`${market} marketplace: ${name} has source ${JSON.stringify(source)}, expected ./plugins/<name>`);
    } else if (source !== `./plugins/${name}`) {
      fail(`${market} marketplace: ${name} points at ${source}`);
    }
  }
}

// Each plugin: both manifests agree with each other and with the marketplaces.
for (const { name } of entries.claude) {
  const dir = `plugins/${name}`;
  const portable = json(`${dir}/plugin.json`);
  const claude = json(`${dir}/.claude-plugin/plugin.json`);
  json(`${dir}/mcp.json`);
  if (!portable || !claude) continue;
  for (const field of ["name", "version", "description"]) {
    if (portable[field] !== claude[field]) {
      fail(`${dir}: ${field} differs between plugin.json (${portable[field]}) and .claude-plugin/plugin.json (${claude[field]})`);
    }
  }
  if (portable.name !== name) fail(`${dir}/plugin.json: name is ${portable.name}, folder is ${name}`);
  for (const market of ["claude", "cursor"]) {
    const entry = entries[market].find((e) => e.name === name);
    if (entry && entry.description !== portable.description) {
      fail(`${market} marketplace: ${name} description differs from ${dir}/plugin.json`);
    }
  }
  if (claude.mcpServers !== "./mcp.json") fail(`${dir}/.claude-plugin/plugin.json: mcpServers should be "./mcp.json"`);

  const openai = portable.extensions?.["com.openai"] ?? {};
  for (const rel of [openai.onboardingSkill, openai.interface?.composerIcon, openai.interface?.logo]) {
    if (rel && !existsSync(join(ROOT, dir, rel))) fail(`${dir}/plugin.json: ${rel} does not exist`);
  }

  // Skills: frontmatter name matches the folder, has a description, no symlinks.
  const skillsDir = join(ROOT, dir, "skills");
  for (const skill of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
    const file = join(skillsDir, skill, "SKILL.md");
    if (lstatSync(join(skillsDir, skill)).isSymbolicLink()) fail(`${dir}/skills/${skill} is a symlink`);
    if (!existsSync(file)) {
      fail(`${dir}/skills/${skill} has no SKILL.md`);
      continue;
    }
    const front = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const skillName = front.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    if (skillName !== skill) fail(`${dir}/skills/${skill}/SKILL.md: name is ${skillName}`);
    if (!/^description:\s*\S/m.test(front)) fail(`${dir}/skills/${skill}/SKILL.md: no description`);
    if (skillNames.has(skill)) fail(`skill ${skill} is in both ${skillNames.get(skill)} and ${dir}`);
    skillNames.set(skill, dir);
  }
}

// The Corsair MCP URL and version are written in four formats that can't share a file.
const corsair = json("plugins/corsair/plugin.json");
const urls = {
  "plugins/corsair/mcp.json": json("plugins/corsair/mcp.json")?.mcpServers?.corsair?.url,
  "gemini-extension.json": json("gemini-extension.json")?.mcpServers?.corsair?.httpUrl,
  "plugins/corsair/server.json": json("plugins/corsair/server.json")?.remotes?.[0]?.url,
};
if (new Set(Object.values(urls)).size !== 1) fail(`Corsair MCP URL differs: ${JSON.stringify(urls)}`);
for (const rel of ["gemini-extension.json", "plugins/corsair/server.json"]) {
  const v = json(rel)?.version;
  if (corsair && v !== corsair.version) fail(`${rel}: version ${v}, plugin is ${corsair.version}`);
}

// The synced SDK skill names where it came from.
const record = json("sync/corsair-skill.json");
if (record && (record.repository !== "corsairdev/corsair" || record.path !== "skills/corsair")) {
  fail("sync/corsair-skill.json: expected corsairdev/corsair skills/corsair");
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log(`ok: ${entries.claude.length} plugins, ${skillNames.size} skills`);
