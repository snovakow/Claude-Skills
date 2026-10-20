#!/usr/bin/env node
// Read-only helper for the /executioner skill: finds another thread's transcript and prints its
// tail, so the executioner reads a milestone thread's report without loading the whole file into
// its own context. It reads files and changes nothing. Node 18 or later, no dependencies.
//
//     node tail.mjs --find "<text>" [--cwd <dir>] [--not <session id>]
//         list the transcripts of the project at <dir> (the working directory by default) whose
//         text holds <text>, newest first, leaving out the session named by --not (this thread's
//         own id; the session id in the environment when --not is omitted)
//     node tail.mjs <transcript.jsonl> [--last <n>]
//         print the text of the last <n> assistant messages (default 2): their prose, any question
//         they posed with AskUserQuestion, and the user message that followed if any; then the
//         model, effort and time of the last assistant message

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BLOCK_MAX = 20_000; // characters printed per text block before it is cut

const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));

// The transcripts of a project live under ~/.claude/projects/<folder> (or under CLAUDE_CONFIG_DIR),
// where <folder> is the working directory with every character that is not a letter or a digit
// replaced by '-'. The record shape inside a transcript is internal to Claude Code and may change;
// only text blocks, questions posed and a few labelled fields are read here.
const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const projectFolder = (cwd) => join(configDir, 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'));

const records = (path) => {
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line) continue;
    try { out.push(JSON.parse(line)); } catch { /* a partial last line while the thread writes */ }
  }
  return out;
};

const textOf = (content) => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text') parts.push(block.text);
    else if (block.type === 'tool_use' && block.name === 'AskUserQuestion') {
      for (const q of block.input?.questions ?? []) {
        parts.push(`[question posed] ${q.question}`);
        for (const o of q.options ?? []) parts.push(`  - ${o.label}: ${o.description ?? ''}`);
      }
    }
  }
  return parts.join('\n');
};

const cut = (s) => (s.length > BLOCK_MAX ? `${s.slice(0, BLOCK_MAX)}\n[... ${s.length - BLOCK_MAX} more characters]` : s);

if (option('--find') !== undefined) {
  const text = option('--find');
  const dir = projectFolder(option('--cwd') ?? process.cwd());
  const self = option('--not') ?? process.env.CLAUDE_CODE_SESSION_ID ?? process.env.CLAUDE_SESSION_ID ?? '';
  let names;
  try { names = readdirSync(dir).filter((n) => n.endsWith('.jsonl')); } catch { console.log(`no transcripts at ${dir}`); process.exit(0); }
  const found = [];
  for (const name of names) {
    if (self && name.startsWith(self)) continue;
    const path = join(dir, name);
    const body = readFileSync(path, 'utf8');
    if (!body.includes(text)) continue;
    let title = '', mode = '';
    for (const r of records(path)) {
      if (r.type === 'ai-title' && r.aiTitle) title = r.aiTitle;
      if (r.type === 'user' && r.permissionMode) mode = r.permissionMode;
    }
    found.push({ path, mtime: statSync(path).mtime, size: body.length, title, mode });
  }
  found.sort((a, b) => b.mtime - a.mtime);
  if (found.length === 0) console.log(`no transcript under ${dir} holds "${text}"`);
  for (const f of found) console.log(`${f.mtime.toISOString()}  ${String(f.size).padStart(9)}  ${f.mode.padEnd(6)}  ${f.path}  ${f.title}`);
  process.exit(0);
}

if (!file) { console.error('usage: tail.mjs --find "<text>" [--cwd <dir>] [--not <id>]  |  tail.mjs <transcript.jsonl> [--last <n>]'); process.exit(2); }

const last = Number(option('--last') ?? 2);
const all = records(file).filter((r) => (r.type === 'user' || r.type === 'assistant') && !r.isSidechain);
// Group the assistant's consecutive records into messages; a user record ends a message.
const messages = [];
for (const r of all) {
  const text = textOf(r.message?.content);
  if (r.type === 'assistant') {
    const top = messages[messages.length - 1];
    if (top && top.role === 'assistant' && !top.closed) { top.text += (text ? `\n${text}` : ''); top.record = r; }
    else messages.push({ role: 'assistant', text, record: r });
  } else {
    const top = messages[messages.length - 1];
    if (top && top.role === 'assistant') top.closed = true;
    // A user record that is only tool results carries no prose; keep the ones a person typed.
    if (text.trim() && !/^\[?tool_result/.test(text)) messages.push({ role: 'user', text, record: r });
  }
}
const assistantIdx = messages.map((m, i) => (m.role === 'assistant' && m.text.trim() ? i : -1)).filter((i) => i >= 0);
const from = assistantIdx[Math.max(0, assistantIdx.length - last)] ?? messages.length;
for (const m of messages.slice(from)) {
  if (!m.text.trim()) continue; // tool calls alone, with no prose to print
  console.log(`\n#### ${m.role.toUpperCase()} ${m.record.timestamp ?? ''}\n${cut(m.text.trim())}`);
}
const lastAssistant = [...all].reverse().find((r) => r.type === 'assistant');
if (lastAssistant) {
  const m = lastAssistant.message ?? {};
  console.log(`\n---\nlast assistant record: ${lastAssistant.timestamp ?? ''}  model ${m.model ?? '?'}  effort ${lastAssistant.effort ?? lastAssistant.perTurnEffort ?? '?'}  cwd ${lastAssistant.cwd ?? '?'}`);
}
const lastRecord = all[all.length - 1];
if (lastRecord?.type === 'user') console.log('the transcript ends on a user message: the thread may still be running, or was interrupted');
