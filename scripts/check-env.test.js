// W1-7: check-env.js must fail whenever a production URL or key shows up
// in staging config, and must never echo the offending value. Uses the
// built-in node:test runner (no dependencies) so this same file runs in
// both gd-proto and placeme-UI: `node --test scripts/`.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './check-env.js';

const PROD_REF = 'prodrefaaaaaaaaaaaaa';
const STAGING_REF = 'stagingrefbbbbbbbbbb';

function fakeSupabaseJwt(payload) {
  const part = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part(payload)}.c2lnbmF0dXJlLW5vdC1jaGVja2Vk`;
}

function workspace(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-env-'));
  const markers = {
    supabaseProjectRefs: [PROD_REF],
    hosts: ['api.prod.example', 'app.prod.example', 'prod.example'],
  };
  writeFileSync(join(dir, 'markers.json'), JSON.stringify(markers));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return {
    dir,
    check: (args, env = {}) => run({ argv: ['--markers', 'markers.json', ...args], env, cwd: dir }),
  };
}

const CLEAN_STAGING = [
  '# staging values only',
  `SUPABASE_URL=https://${STAGING_REF}.supabase.co`,
  'SUPABASE_SERVICE_ROLE_KEY=sb_secret_staging_only_value_123456',
  'LIVEKIT_URL=wss://placeme-staging.livekit.cloud',
  'ALLOWED_ORIGINS=https://staging.prod.example,https://placeme-ui-*-team.vercel.app',
  'NODE_ENV=production',
  '',
].join('\n');

describe('check-env: clean staging config', () => {
  it('passes and says what it checked', () => {
    const { check } = workspace({ 'staging.env': CLEAN_STAGING });
    const result = check(['--staging', 'staging.env']);
    assert.equal(result.code, 0, result.out);
    assert.match(result.out, /OK/);
    assert.match(result.out, /staging\.env/);
  });

  it('treats a subdomain of a production host as a different host (host equality, not substring)', () => {
    const { check } = workspace({ 'staging.env': 'VITE_API_URL=https://staging.prod.example\n' });
    assert.equal(check(['--staging', 'staging.env']).code, 0);
  });

  it('ignores production identifiers mentioned in comments', () => {
    const { check } = workspace({ 'staging.env': `# never use https://${PROD_REF}.supabase.co here\n` });
    assert.equal(check(['--staging', 'staging.env']).code, 0);
  });
});

describe('check-env: production identifiers', () => {
  it('fails on the production Supabase project ref and names file, line and key', () => {
    const { check } = workspace({
      'staging.env': `PORT=3000\nVITE_SUPABASE_URL="https://${PROD_REF}.supabase.co"\n`,
    });
    const result = check(['--staging', 'staging.env']);
    assert.equal(result.code, 1);
    assert.match(result.out, /staging\.env:2 VITE_SUPABASE_URL/);
    assert.match(result.out, /production Supabase project/);
  });

  it('fails on a production host inside a comma-separated origin list', () => {
    const { check } = workspace({
      'staging.env': 'ALLOWED_ORIGINS=https://staging.prod.example, https://app.prod.example\n',
    });
    const result = check(['--staging', 'staging.env']);
    assert.equal(result.code, 1);
    assert.match(result.out, /ALLOWED_ORIGINS/);
    assert.match(result.out, /app\.prod\.example/);
  });

  it('fails on a legacy Supabase JWT key issued for the production project, without printing it', () => {
    const jwt = fakeSupabaseJwt({ iss: 'supabase', ref: PROD_REF, role: 'service_role' });
    const { check } = workspace({ 'staging.env': `SUPABASE_SERVICE_ROLE_KEY=${jwt}\n` });
    const result = check(['--staging', 'staging.env']);
    assert.equal(result.code, 1);
    assert.match(result.out, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(result.out, /production Supabase project/);
    assert.ok(!result.out.includes(jwt), 'must not print the key');
  });

  it('accepts a JWT issued for another project', () => {
    const jwt = fakeSupabaseJwt({ iss: 'supabase', ref: STAGING_REF, role: 'anon' });
    const { check } = workspace({ 'staging.env': `SUPABASE_ANON_KEY=${jwt}\n` });
    assert.equal(check(['--staging', 'staging.env']).code, 0);
  });

  it('reads Render blueprint values and attributes them to their key', () => {
    const blueprint = [
      'services:',
      '  - type: web',
      '    name: placeme-server-staging',
      '    branch: dev',
      '    envVars:',
      '      - key: NODE_ENV',
      '        value: production',
      '      - key: ALLOWED_ORIGINS',
      "        value: 'https://app.prod.example'",
      '      - key: SUPABASE_URL',
      '        sync: false',
      '',
    ].join('\n');
    const { check } = workspace({ 'render.staging.yaml': blueprint });
    const result = check(['--staging', 'render.staging.yaml']);
    assert.equal(result.code, 1);
    assert.match(result.out, /render\.staging\.yaml:9 ALLOWED_ORIGINS/);
  });
});

describe('check-env: production secret values', () => {
  const PROD_ENV = [
    `SUPABASE_URL=https://${PROD_REF}.supabase.co`,
    'LIVEKIT_URL=wss://placeme-prod.livekit.cloud',
    'LIVEKIT_API_SECRET=prod-livekit-secret-value-0123456789',
    'NODE_ENV=production',
    'GEMINI_MODEL=gemini-3.6-flash',
    'PORT=3000',
    'GEMINI_KEY_POOL_ENABLED=false',
    '',
  ].join('\n');

  it('fails when a staging value equals a production value from --prod, naming the production key only', () => {
    const { check } = workspace({
      'prod.env': PROD_ENV,
      'staging.env': `${CLEAN_STAGING}LIVEKIT_API_SECRET=prod-livekit-secret-value-0123456789\n`,
    });
    const result = check(['--staging', 'staging.env', '--prod', 'prod.env']);
    assert.equal(result.code, 1);
    assert.match(result.out, /LIVEKIT_API_SECRET .*production LIVEKIT_API_SECRET/);
    assert.ok(!result.out.includes('prod-livekit-secret-value'), 'must not print the secret');
  });

  it('learns production hosts from --prod URLs', () => {
    const { check } = workspace({
      'prod.env': PROD_ENV,
      'staging.env': 'LIVEKIT_URL=wss://placeme-prod.livekit.cloud/\n',
    });
    const result = check(['--staging', 'staging.env', '--prod', 'prod.env']);
    assert.equal(result.code, 1);
    assert.match(result.out, /placeme-prod\.livekit\.cloud/);
  });

  it('does not treat shared, non-identifying settings as leaks', () => {
    const { check } = workspace({ 'prod.env': PROD_ENV, 'staging.env': CLEAN_STAGING + 'GEMINI_MODEL=gemini-3.6-flash\nPORT=3000\nGEMINI_KEY_POOL_ENABLED=false\n' });
    const result = check(['--staging', 'staging.env', '--prod', 'prod.env']);
    assert.equal(result.code, 0, result.out);
  });

  it('only learns markers from app variables in --prod, not platform ones like VERCEL_GIT_* that match everywhere', () => {
    const platform = 'VERCEL_GIT_REPO_OWNER="placemestudy1"\nVERCEL_GIT_REPO_ID="123456789012"\n';
    const { check } = workspace({ 'prod.env': platform, 'staging.env': platform });
    const result = check(['--staging', 'staging.env', '--prod', 'prod.env']);
    assert.equal(result.code, 0, result.out);
  });

  it('takes production values from CHECK_ENV_PROD_VALUES (CI secrets), one per line or comma', () => {
    const { check } = workspace({ 'staging.env': 'GEMINI_API_KEY=AIzaProdKeyThatMustNotBeShared000\n' });
    const env = { CHECK_ENV_PROD_VALUES: 'unrelated-value-123456789\nAIzaProdKeyThatMustNotBeShared000' };
    const result = check(['--staging', 'staging.env'], env);
    assert.equal(result.code, 1);
    assert.match(result.out, /GEMINI_API_KEY/);
    assert.ok(!result.out.includes('AIzaProdKey'), 'must not print the secret');
  });

  it('ignores empty CHECK_ENV_PROD_VALUES entries (unset CI secrets expand to empty strings)', () => {
    const { check } = workspace({ 'staging.env': CLEAN_STAGING });
    const result = check(['--staging', 'staging.env'], { CHECK_ENV_PROD_VALUES: '\n\n,,' });
    assert.equal(result.code, 0, result.out);
  });
});

describe('check-env: process environment and required keys', () => {
  it('--staging-env checks the known app variables in the current environment', () => {
    const { check } = workspace({});
    const env = { VITE_API_URL: 'https://api.prod.example', UNRELATED_TOOL_URL: 'https://api.prod.example' };
    const result = check(['--staging-env'], env);
    assert.equal(result.code, 1);
    assert.match(result.out, /\(environment\) VITE_API_URL/);
    assert.ok(!result.out.includes('UNRELATED_TOOL_URL'));
  });

  it('--require fails when a listed key is missing or empty in every staging source', () => {
    const { check } = workspace({ 'staging.env': `VITE_SUPABASE_URL=https://${STAGING_REF}.supabase.co\nVITE_API_URL=\n` });
    const result = check(['--staging', 'staging.env', '--require', 'VITE_SUPABASE_URL,VITE_API_URL,VITE_SUPABASE_ANON_KEY']);
    assert.equal(result.code, 1);
    assert.match(result.out, /missing.*VITE_API_URL/);
    assert.match(result.out, /missing.*VITE_SUPABASE_ANON_KEY/);
    assert.ok(!/missing.*VITE_SUPABASE_URL/.test(result.out));
  });
});

describe('check-env: usage', () => {
  it('exits 2 when there is nothing to check', () => {
    const { check } = workspace({});
    assert.equal(check([]).code, 2);
  });

  it('exits 2 when a staging file does not exist, instead of passing silently', () => {
    const { check } = workspace({});
    assert.equal(check(['--staging', 'nope.env']).code, 2);
  });

  it('runs as a CLI with the exit code as the process status', () => {
    const { dir } = workspace({ 'staging.env': `SUPABASE_URL=https://${PROD_REF}.supabase.co\n` });
    const script = join(dirname(fileURLToPath(import.meta.url)), 'check-env.js');
    assert.throws(
      () => execFileSync(process.execPath, [script, '--markers', 'markers.json', '--staging', 'staging.env'], { cwd: dir, stdio: 'pipe' }),
      (err) => err.status === 1,
    );
  });

  it('ships production markers with the documented Supabase project ref', () => {
    const result = run({ argv: ['--staging-env'], env: {}, cwd: dirname(fileURLToPath(import.meta.url)) });
    assert.equal(result.code, 0, result.out);
    const leak = run({
      argv: ['--staging-env'],
      env: { SUPABASE_URL: 'https://uiqshhuiykwopqkrvyci.supabase.co' },
      cwd: dirname(fileURLToPath(import.meta.url)),
    });
    assert.equal(leak.code, 1);
  });
});
