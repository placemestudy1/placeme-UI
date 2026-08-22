#!/usr/bin/env node
// CI drift gate: regenerates src/lib/api-types.generated.ts from the
// vendored openapi/gd-proto.openapi.yaml and fails if it doesn't match
// what's committed -- catches a hand-edited generated file, or a vendored
// spec that was updated without re-running `npm run generate:api-types`.
//
// This does NOT check whether the vendored spec itself is still current
// relative to gd-proto's real HEAD -- that requires a cross-repo fetch
// this repo's CI doesn't have credentials for (openapi/GD_PROTO_REF
// records the gd-proto commit it was last synced from; bump it via
// `npm run sync-contract` when gd-proto's contract changes, same as any
// other vendored dependency).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const generatedPath = resolve(root, "src", "lib", "api-types.generated.ts");
const committed = readFileSync(generatedPath, "utf8");

// shell: true so this resolves npx.cmd on Windows too (execFileSync
// otherwise looks for a literal "npx" binary and fails with ENOENT there).
const fresh = execFileSync("npx openapi-typescript openapi/gd-proto.openapi.yaml", {
  cwd: root,
  encoding: "utf8",
  shell: true,
});

const normalize = (s) => s.replace(/\r\n/g, "\n").trim();

if (normalize(committed) !== normalize(fresh)) {
  console.error(
    "src/lib/api-types.generated.ts is stale relative to openapi/gd-proto.openapi.yaml.\n" +
      "Run `npm run generate:api-types` and commit the result.",
  );
  process.exit(1);
}

console.log("api-types.generated.ts matches the vendored OpenAPI contract.");
