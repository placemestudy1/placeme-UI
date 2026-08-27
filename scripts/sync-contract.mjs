#!/usr/bin/env node
// Dev-convenience only, not run in CI: copies gd-proto's OpenAPI contract
// from a sibling checkout (../gd-proto, matching how this repo and
// gd-proto sit side by side under c:\dev\placeme in local dev) into
// openapi/gd-proto.openapi.yaml, and stamps openapi/GD_PROTO_REF with the
// gd-proto commit it came from. Run this after pulling a gd-proto change
// that touches its API, then `npm run generate:api-types` and commit both
// the updated openapi/ files and the regenerated src/lib/api-types.generated.ts.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const gdProtoDir = resolve(import.meta.dirname, "..", "..", "gd-proto");
const specSource = resolve(gdProtoDir, "docs", "api", "openapi.yaml");
const specDest = resolve(import.meta.dirname, "..", "openapi", "gd-proto.openapi.yaml");
const refDest = resolve(import.meta.dirname, "..", "openapi", "GD_PROTO_REF");

if (!existsSync(specSource)) {
  console.error(
    `No gd-proto checkout found at ${gdProtoDir} (expected openapi.yaml at ${specSource}). ` +
      "This script only works with gd-proto cloned as a sibling directory; it's not meant to run in CI.",
  );
  process.exit(1);
}

const sha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: gdProtoDir,
  encoding: "utf8",
}).trim();
const status = execFileSync("git", ["status", "--porcelain", "--", "docs/api/openapi.yaml"], {
  cwd: gdProtoDir,
  encoding: "utf8",
});
if (status.trim()) {
  console.error(
    `gd-proto's docs/api/openapi.yaml has uncommitted changes -- commit or stash them in ${gdProtoDir} first so the vendored copy is pinned to a real commit, not a working-tree snapshot.`,
  );
  process.exit(1);
}

copyFileSync(specSource, specDest);
writeFileSync(refDest, `${sha}\n`);
console.log(`Synced openapi/gd-proto.openapi.yaml from gd-proto@${sha}.`);
console.log(
  "Next: npm run generate:api-types, then commit openapi/ and src/lib/api-types.generated.ts.",
);
