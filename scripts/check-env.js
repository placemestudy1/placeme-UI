#!/usr/bin/env node
// W1-7: fail if a production URL or key appears in staging config.
//
// The same file lives in gd-proto/scripts/ and placeme-UI/scripts/
// (placeme-UI's CI can't read the private gd-proto repo). gd-proto's copy
// is the source of truth; copy it over unchanged, with its test and
// prod-markers.json. Zero dependencies, Node >= 22.
//
// What counts as "production":
//   1. prod-markers.json next to this file: public production identifiers
//      (Supabase project ref, API/app hostnames). No secrets go there.
//   2. --prod <file>: a production env file (e.g. apps/server/.env). Every
//      distinctive value of an app variable (APP_ENV_VARS) in it becomes a
//      marker, and its URLs' hosts too. Platform variables such as
//      VERCEL_GIT_* are the same in every environment, so they don't count.
//   3. CHECK_ENV_PROD_VALUES: production values separated by newlines or
//      commas, for CI to pass in from secrets.
// A legacy Supabase JWT key is also decoded, and fails if its `ref` claim
// is a production project, even though the key text never contains it.
//
// Usage:
//   node scripts/check-env.js --staging <file> [--staging <file>...]
//        [--staging-env] [--prod <file>] [--require KEY,KEY] [--markers <file>]
// Exit codes: 0 clean, 1 production value found or required key missing,
// 2 usage error. Findings name the file, line and key; they never print
// the value.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every env var either app reads (see docs/runbooks/staging-environment.md).
// --staging-env checks these, and only these, in the current environment.
export const APP_ENV_VARS = [
  // gd-proto/apps/server
  'NODE_ENV', 'PORT', 'ALLOWED_ORIGINS', 'HEALTH_CHECK_TOKEN',
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY',
  'LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET',
  'ASSEMBLYAI_API_KEY',
  'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_MODEL_FEEDBACK',
  'GEMINI_MODEL_TRANSCRIPT_ANALYSIS', 'GEMINI_MODEL_CRITERION_EVALUATION',
  'GEMINI_KEY_POOL_ENABLED', 'GEMINI_KEY_POOL_DAILY_BUDGET_PER_KEY',
  'GEMINI_KEY_POOL_MAX_CONCURRENCY_PER_KEY', 'GEMINI_KEY_POOL_ACQUIRE_TIMEOUT_MS',
  ...Array.from({ length: 24 }, (_, i) => `GEMINI_API_KEY_${i + 1}`),
  'EARLY_LEAVE_EVALUATION_ENABLED', 'INTERNAL_TEST_USER_IDS',
  // placeme-UI (Vite, baked into the browser bundle at build time)
  'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_API_URL',
  'VITE_POSTHOG_KEY', 'VITE_POSTHOG_HOST', 'NITRO_PRESET',
];

// Settings that are legitimately identical in production and staging and
// identify nothing, so a --prod value for them is never a marker.
const SHARED_KEYS = new Set([
  'NODE_ENV', 'PORT', 'NITRO_PRESET', 'VITE_POSTHOG_HOST',
  'GEMINI_MODEL', 'GEMINI_MODEL_FEEDBACK', 'GEMINI_MODEL_TRANSCRIPT_ANALYSIS',
  'GEMINI_MODEL_CRITERION_EVALUATION', 'GEMINI_KEY_POOL_ENABLED',
  'GEMINI_KEY_POOL_DAILY_BUDGET_PER_KEY', 'GEMINI_KEY_POOL_MAX_CONCURRENCY_PER_KEY',
  'GEMINI_KEY_POOL_ACQUIRE_TIMEOUT_MS', 'EARLY_LEAVE_EVALUATION_ENABLED',
]);

// Shorter values ("true", "3000") are too common to mean anything.
const MIN_SECRET_LENGTH = 12;

const DEFAULT_MARKERS = resolve(dirname(fileURLToPath(import.meta.url)), 'prod-markers.json');

function unquote(raw) {
  let value = raw.trim();
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.lastIndexOf(quote) > 0) {
    return value.slice(1, value.lastIndexOf(quote));
  }
  const comment = value.search(/\s#/);
  if (comment !== -1) value = value.slice(0, comment);
  return value.trim();
}

// Reads dotenv files (`KEY=value`, what `vercel env pull` writes) and
// YAML such as a Render blueprint (`- key: X` then `value: Y`, or plain
// `name: value`). Comment and blank lines are skipped.
export function parseConfig(text) {
  const entries = [];
  let blueprintKey = null;
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) return;
    const lineNo = index + 1;
    const dotenv = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (dotenv) {
      entries.push({ key: dotenv[1], value: unquote(dotenv[2]), line: lineNo });
      return;
    }
    const yaml = /^(?:-\s+)?([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!yaml) return;
    const [, name, rest] = yaml;
    const value = unquote(rest);
    if (name === 'key') {
      blueprintKey = value;
    } else if (name === 'value' && blueprintKey) {
      entries.push({ key: blueprintKey, value, line: lineNo });
    } else if (value) {
      entries.push({ key: name, value, line: lineNo });
    }
  });
  return entries;
}

function hostsIn(value) {
  const hosts = [];
  for (const part of value.split(/[\s,]+/)) {
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(part)) continue;
    try {
      hosts.push(new URL(part).hostname.toLowerCase());
    } catch {
      // not a URL after all
    }
  }
  return hosts;
}

function jwtRefs(value) {
  const refs = [];
  for (const [, payload] of value.matchAll(/eyJ[\w-]*\.(eyJ[\w-]*)\.[\w-]*/g)) {
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (typeof claims.ref === 'string') refs.push(claims.ref.toLowerCase());
    } catch {
      // not a JSON payload
    }
  }
  return refs;
}

function loadMarkers({ markersPath, prodFiles, env }) {
  const file = JSON.parse(readFileSync(markersPath, 'utf8'));
  const markers = {
    refs: new Set((file.supabaseProjectRefs ?? []).map((ref) => ref.toLowerCase())),
    hosts: new Set((file.hosts ?? []).map((host) => host.toLowerCase())),
    values: [], // { value, label }
  };
  const addValue = (value, label) => {
    if (value.length < MIN_SECRET_LENGTH) return;
    for (const host of hostsIn(value)) markers.hosts.add(host);
    markers.values.push({ value, label });
  };
  for (const prodFile of prodFiles) {
    for (const { key, value } of parseConfig(readFileSync(prodFile, 'utf8'))) {
      if (APP_ENV_VARS.includes(key) && !SHARED_KEYS.has(key)) addValue(value, `production ${key}`);
    }
  }
  for (const value of (env.CHECK_ENV_PROD_VALUES ?? '').split(/[\n,]/)) {
    if (value.trim()) addValue(value.trim(), 'a production value from CHECK_ENV_PROD_VALUES');
  }
  return markers;
}

function findLeaks(entry, markers) {
  const reasons = new Set();
  const lower = entry.value.toLowerCase();
  for (const ref of markers.refs) {
    if (lower.includes(ref)) reasons.add('points at the production Supabase project');
  }
  for (const ref of jwtRefs(entry.value)) {
    if (markers.refs.has(ref)) reasons.add('is a key for the production Supabase project');
  }
  for (const host of hostsIn(entry.value)) {
    if (markers.hosts.has(host)) reasons.add(`uses production host ${host}`);
  }
  for (const { value, label } of markers.values) {
    if (entry.value === value || entry.value.includes(value)) reasons.add(`has the same value as ${label}`);
  }
  return [...reasons];
}

function parseArgs(argv) {
  const opts = { staging: [], prod: [], require: [], stagingEnv: false, markers: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${flag} needs a value`);
      return value;
    };
    if (flag === '--staging') opts.staging.push(next());
    else if (flag === '--prod') opts.prod.push(next());
    else if (flag === '--markers') opts.markers = next();
    else if (flag === '--require') opts.require.push(...next().split(',').map((k) => k.trim()).filter(Boolean));
    else if (flag === '--staging-env') opts.stagingEnv = true;
    else throw new Error(`unknown option ${flag}`);
  }
  return opts;
}

export function run({ argv, env = process.env, cwd = process.cwd() }) {
  const lines = [];
  let opts;
  try {
    opts = parseArgs(argv);
    if (!opts.staging.length && !opts.stagingEnv) throw new Error('nothing to check: pass --staging <file> or --staging-env');
    for (const file of [...opts.staging, ...opts.prod]) {
      if (!existsSync(resolve(cwd, file))) throw new Error(`file not found: ${file}`);
    }
  } catch (err) {
    return { code: 2, out: `check-env: ${err.message}` };
  }

  const markers = loadMarkers({
    markersPath: opts.markers ? resolve(cwd, opts.markers) : DEFAULT_MARKERS,
    prodFiles: opts.prod.map((file) => resolve(cwd, file)),
    env,
  });

  const sources = opts.staging.map((file) => ({
    label: file,
    entries: parseConfig(readFileSync(resolve(cwd, file), 'utf8')),
  }));
  if (opts.stagingEnv) {
    sources.push({
      label: '(environment)',
      entries: APP_ENV_VARS.filter((key) => env[key]).map((key) => ({ key, value: env[key], line: null })),
    });
  }

  let failed = false;
  const present = new Set();
  for (const { label, entries } of sources) {
    for (const entry of entries) {
      if (entry.value) present.add(entry.key);
      for (const reason of findLeaks(entry, markers)) {
        failed = true;
        const where = entry.line === null ? label : `${label}:${entry.line}`;
        lines.push(`FAIL ${where} ${entry.key} ${reason}`);
      }
    }
  }
  for (const key of opts.require) {
    if (!present.has(key)) {
      failed = true;
      lines.push(`FAIL missing required staging value ${key}`);
    }
  }

  const checked = sources.map((s) => s.label).join(', ');
  lines.push(failed ? `check-env: production config found in staging (${checked})` : `check-env: OK, no production values in ${checked}`);
  return { code: failed ? 1 : 0, out: lines.join('\n') };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { code, out } = run({ argv: process.argv.slice(2) });
  (code === 0 ? console.log : console.error)(out);
  process.exitCode = code;
}
