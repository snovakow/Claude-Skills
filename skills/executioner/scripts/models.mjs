#!/usr/bin/env node
// Read-only helper for the /executioner skill: says which Claude models the signed-in account can
// use, and whether Fable draws on the plan's own limits or on usage credits, from what Claude Code
// caches, so the executioner can name the strongest model without guessing. It reads the model
// catalog cache, two model-access entries of the account file, and the user's settings, prints
// nothing else from them, and changes nothing. Node 18 or later, no dependencies.
//
//     node models.mjs
//
// Prints the catalog's models, the access notes found, the strongest model and why, the defaults
// in settings.json, and the effort this session runs at. Where the caches say nothing it says so,
// and the executioner states the strongest model available to the user instead of detecting it.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const CREDITS = /requires usage credits/i; // the wording the /model picker adds to a row that bills to credits
const rank = (id) => (/^claude-fable-/.test(id) ? 3 : /^claude-opus-/.test(id) ? 2 : /^claude-sonnet-/.test(id) ? 1 : 0);
const version = (id) => (id.match(/-(\d+)(?:-(\d+))?(?:-\d{8})?$/) ?? []).slice(1).map((n) => Number(n ?? 0));
const newer = (a, b) => rank(a) - rank(b) || (version(a)[0] ?? 0) - (version(b)[0] ?? 0) || (version(a)[1] ?? 0) - (version(b)[1] ?? 0);
const readJson = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; } };

// The catalog: one file per organization and surface under the cache; the Claude Code surface is
// "cc", and the newest file is the one the running Claude Code fetched for the signed-in account.
let models = null, fetched = null;
try {
  const dir = join(configDir, 'cache', 'model-catalog');
  const files = readdirSync(dir).filter((n) => n.endsWith('-cc.json')).map((n) => join(dir, n));
  files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  const data = files[0] ? readJson(files[0]) : null;
  models = data?.catalog?.config?.models ?? null;
  fetched = data?.fetchedAt ? new Date(data.fetchedAt).toISOString().slice(0, 10) : null;
} catch { /* no cache: said below */ }

// Access notes beside it, in the account file: which models the account is entitled to, and the
// picker's own description of the Fable option, which carries the credits wording where it applies.
const account = readJson(join(homedir(), '.claude.json')) ?? {};
const entitled = new Map();
for (const e of Array.isArray(account.modelAccessCache) ? account.modelAccessCache : []) {
  if (e && typeof e.apiName === 'string' && typeof e.entitled === 'boolean') entitled.set(e.apiName, e.entitled);
}
const options = Array.isArray(account.additionalModelOptionsCache) ? account.additionalModelOptionsCache : [];
const creditsOnly = new Set();
for (const o of options) {
  if (o && typeof o.value === 'string' && CREDITS.test(String(o.description ?? ''))) creditsOnly.add(o.value.replace(/\[1m\]$/, ''));
}

if (!models) {
  console.log(`No model catalog is cached under ${join(configDir, 'cache', 'model-catalog')}, so the available models are not known here.`);
  console.log('Strongest model: unknown. State it as the strongest available to the user: Fable 5.1 where the plan includes it, otherwise Opus 5.5; the /model picker says "Requires usage credits" on the Fable row where it does not.');
} else {
  console.log(`Models in the account's catalog (fetched ${fetched ?? 'at an unknown time'}):`);
  for (const m of models) {
    const notes = [];
    if (entitled.has(m.id)) notes.push(entitled.get(m.id) ? 'entitled' : 'not entitled');
    if (creditsOnly.has(m.id) || creditsOnly.has(m.id.split('-')[1])) notes.push('requires usage credits');
    if (m.notice?.text) notes.push(m.notice.text);
    console.log(`  ${m.id.padEnd(28)} ${String(m.name ?? '').padEnd(12)} ${String(m.section ?? '').padEnd(9)}${notes.length ? ' ' + notes.join('; ') : ''}`);
  }
  const usable = (id) => entitled.get(id) !== false && !creditsOnly.has(id) && !creditsOnly.has(id.split('-')[1]) && !CREDITS.test(String(models.find((m) => m.id === id)?.notice?.text ?? ''));
  const ids = models.map((m) => m.id).filter((id) => rank(id) > 0).sort(newer);
  const best = [...ids].reverse().find(usable);
  const name = (id) => models.find((m) => m.id === id)?.name ?? id;
  const fable = ids.filter((id) => rank(id) === 3);
  const topFable = fable[fable.length - 1];
  if (best && rank(best) === 3) {
    console.log(`\nStrongest model: ${name(best)} (${best}). Fable is listed for this account and nothing read here marks it as unentitled or as billing to usage credits, so it draws on the plan's own limits; its notice above says how fast.`);
  } else if (topFable) {
    console.log(`\nStrongest model: ${best ? `${name(best)} (${best})` : 'none listed'}. ${name(topFable)} is listed but marked ${entitled.get(topFable) === false ? 'not entitled' : 'as requiring usage credits'}, so it is not the model to dictate; Opus 5.5 and below are on every plan.`);
  } else {
    console.log(`\nStrongest model: ${best ? `${name(best)} (${best})` : 'none listed'}. No Fable model is listed for this account.`);
  }
  if (entitled.size === 0 && options.length === 0) {
    console.log('No access notes are cached, so whether Fable bills to usage credits is read from the catalog alone; the /model picker\'s Fable row says "Requires usage credits" where it does.');
  }
}

const settings = readJson(join(configDir, 'settings.json'));
if (settings) {
  const efforts = Object.entries(settings.modelSettings ?? {}).map(([id, s]) => `${id}: ${s.effortLevel ?? '?'}`).join(', ');
  console.log(`\nDefaults in ${join(configDir, 'settings.json')}: model ${settings.model ?? '(unset)'}${efforts ? `; effort by model ${efforts}` : ''}`);
} else console.log(`\nNo ${join(configDir, 'settings.json')} to read defaults from.`);
console.log(`This session: effort ${process.env.CLAUDE_EFFORT ?? '(not in the environment)'}, session id ${process.env.CLAUDE_CODE_SESSION_ID ?? process.env.CLAUDE_SESSION_ID ?? '(not in the environment)'}`);
