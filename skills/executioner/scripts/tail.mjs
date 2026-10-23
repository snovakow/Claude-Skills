#!/usr/bin/env node
// Read-only helper for the /executioner skill: finds another thread's transcript and prints its
// tail, so the executioner reads a milestone thread's report without loading the whole file into
// its own context. It reads files and changes nothing. Node 18 or later, no dependencies.
//
//     node tail.mjs --find "<text>" [--cwd <dir>] [--not <thread id>]
//         list the transcripts of the project at <dir> (the working directory by default) whose
//         text holds <text>, newest first, leaving out the thread named by --not (this thread's
//         own id; the id in the environment when --not is omitted)
//     node tail.mjs <transcript.jsonl> [--last <n>]
//         print the text of the last <n> replies (default 2): the assistant's prose, any question
//         it posed with AskUserQuestion, and the output of a command run directly in the thread,
//         such as a forked skill the user typed; with the messages a person typed after them; then
//         the model, effort and time of the last assistant message

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
// only text blocks, questions posed, command output and a few labelled fields are read here.
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
// A command run directly in the thread, such as a forked skill the user typed, leaves no assistant
// message: its output is a system record of subtype local_command.
const isCommandOutput = (r) => r.type === 'system' && r.subtype === 'local_command';
const all = records(file).filter((r) => (r.type === 'user' || r.type === 'assistant' || isCommandOutput(r)) && !r.isSidechain);
// Group the assistant's consecutive records into messages; a user record or a command's output
// ends a message.
const messages = [];
for (const r of all) {
  if (isCommandOutput(r)) {
    const top = messages[messages.length - 1];
    if (top && top.role === 'assistant') top.closed = true;
    const output = String(r.content ?? '').replace(/<\/?local-command-std(out|err)>/g, '');
    messages.push({ role: 'command output', text: output, record: r });
    continue;
  }
  const text = textOf(r.message?.content);
  if (r.type === 'assistant') {
    const top = messages[messages.length - 1];
    if (top && top.role === 'assistant' && !top.closed) { top.text += (text ? `\n${text}` : ''); top.record = r; }
    else messages.push({ role: 'assistant', text, record: r });
  } else {
    const top = messages[messages.length - 1];
    if (top && top.role === 'assistant') top.closed = true;
    // A skill's expanded text and the harness's caveats are marked isMeta: no person typed them.
    if (r.isMeta) continue;
    // A user record that is only tool results carries no prose; keep the ones a person typed.
    if (text.trim() && !/^\[?tool_result/.test(text)) messages.push({ role: 'user', text, record: r });
  }
}
const replyIdx = messages.map((m, i) => (m.role !== 'user' && m.text.trim() ? i : -1)).filter((i) => i >= 0);
let from = replyIdx[Math.max(0, replyIdx.length - last)] ?? messages.length;
// A command's output is printed with the command typed before it.
if (messages[from]?.role === 'command output' && messages[from - 1]?.role === 'user') from -= 1;
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
