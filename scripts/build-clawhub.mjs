#!/usr/bin/env node
// Builds the ClawHub (OpenClaw) bundle for the corsair plugin into dist/clawhub/corsair.
//
// OpenClaw reads a bundle with .claude-plugin/ as a Claude bundle, and only that
// format's .mcp.json can say `"auth": "oauth"` (Agent Plugins' mcp.json schema is
// closed). So the bundle carries the Claude manifest without inline mcpServers, a
// .mcp.json with the OAuth flag, and the same skills and icon as plugins/corsair.
// Version, description and the MCP URL come from plugins/corsair, so nothing here
// needs editing when the plugin changes.
//
//   node scripts/build-clawhub.mjs
//   npx clawhub package publish dist/clawhub/corsair --family bundle-plugin --owner corsairdev ...

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "plugins/corsair");
const OUT = join(ROOT, "dist/clawhub/corsair");
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const write = (rel, data) =>
  writeFileSync(join(OUT, rel), typeof data === "string" ? data : `${JSON.stringify(data, null, 2)}\n`);

const portable = read(join(SRC, "plugin.json"));
const claude = read(join(SRC, ".claude-plugin/plugin.json"));
const mcpUrl = read(join(SRC, "mcp.json")).mcpServers?.corsair?.url;
if (!mcpUrl) throw new Error("plugins/corsair/mcp.json has no corsair server url");
if (claude.version !== portable.version) throw new Error("plugin.json and .claude-plugin/plugin.json versions differ");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, ".claude-plugin"), { recursive: true });

write("package.json", {
  name: "@corsairdev/corsair",
  version: portable.version,
  description: portable.description,
  homepage: portable.homepage,
  repository: { type: "git", url: "git+https://github.com/corsairdev/agent-plugins.git", directory: "plugins/corsair" },
  license: portable.license,
  keywords: portable.keywords,
});

const { mcpServers: _inline, ...manifest } = claude;
write(".claude-plugin/plugin.json", manifest);

write(".mcp.json", {
  mcpServers: {
    corsair: {
      type: "http",
      url: mcpUrl,
      auth: "oauth",
      description: "Sign in with your Corsair account to use your connected apps.",
    },
  },
});

cpSync(join(SRC, "skills"), join(OUT, "skills"), { recursive: true });
cpSync(join(SRC, "assets"), join(OUT, "assets"), { recursive: true });
const readme = join(ROOT, "clawhub/README.md");
if (!existsSync(readme)) throw new Error("missing clawhub/README.md");
write("README.md", readFileSync(readme, "utf8"));
for (const f of ["LICENSE"]) cpSync(join(ROOT, f), join(OUT, f));

console.log(`built ${OUT} (${portable.version}, ${mcpUrl})`);
