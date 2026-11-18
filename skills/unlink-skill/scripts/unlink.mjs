#!/usr/bin/env node
// Helper for the /unlink-skill skill, the reverse of /link-skill: takes a skill's link out of a
// project's .claude/skills and its line out of the project's exclude file, the plain rm and the line
// taken out by hand that the clone's README gives, with the arguments worked out from where it is
// run; and takes /link-skill and itself out of the user level. It removes links and exclude lines
// only, never a copy, a file, anything committed or anything a link points to. Node 18 or later, no
// dependencies.
//
//     node unlink.mjs                       with nothing at all, in a project: as all; in the clone:
//                                           take link-skill and unlink-skill out of ~/.claude/skills,
//                                           the user level, then the help, which lists the
//                                           repositories beside the clone that still link its skills
//     node unlink.mjs <skill>...            in a project: take out those links, wherever they point
//     node unlink.mjs all                   in a project: every link to a skill of a Claude-Skills
//                                           clone, and every exclude line whose link is already gone
//     node unlink.mjs <skill>... <project>  in the clone: the same in the project, given as a path or
//     node unlink.mjs all <project>         as the name of a folder beside the clone
//     node unlink.mjs --help                the help, and nothing else

import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

// The skills /link-skill installs at the user level, which a bare run in the clone takes out.
const USER_LEVEL = ['link-skill', 'unlink-skill'];
const args = process.argv.slice(2);
const names = args.filter((a) => !a.startsWith('-'));
const wantHelp = args.some((a) => a === '--help' || a === '-h');

const out = (s) => console.log(s);
const fail = (s) => { console.error(s); process.exit(2); };
const expand = (p) => (p === '~' ? homedir() : p.startsWith('~/') ? join(homedir(), p.slice(2)) : p);
const real = (p) => { try { return realpathSync(p); } catch { return null; } };
const stat = (p) => { try { return lstatSync(p); } catch { return null; } };
const listed = (dir) => { try { return readdirSync(dir).sort(); } catch { return []; } };
const git = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const repoRoot = (dir) => { const r = git(dir, 'rev-parse', '--show-toplevel'); return r ? real(r) : null; };
const skillsIn = (clone) => listed(join(clone, 'skills')).filter((n) => existsSync(join(clone, 'skills', n, 'SKILL.md')));
const isClone = (dir) => Boolean(dir) && skillsIn(dir).length > 0;
const shown = (p) => { const r = relative(process.cwd(), p); return r && !r.startsWith('..') ? r : p; };
const skillsDir = (repo) => join(repo, '.claude', 'skills');
const userDir = join(homedir(), '.claude', 'skills');
let failed = false;

// A link to a skill of a Claude-Skills clone, as /link-skill and the clone's README make one:
// <clone>/skills/<name>. A .claude folder's skills, a project's or the user level's, are no clone's.
// Where the target is gone, as when the clone has moved, the path the link holds is judged by that
// shape alone.
const toClone = (link) => {
  const to = real(link);
  let held = to;
  if (!held) { try { held = resolve(dirname(link), readlinkSync(link)); } catch { return false; } }
  const folder = dirname(held);
  if (basename(folder) !== 'skills' || basename(dirname(folder)) === '.claude') return false;
  return to ? isClone(dirname(folder)) : true;
};

// The names under .claude/skills that the repository has committed, which stay whatever they are.
const committed = (repo) => new Set((git(repo, 'ls-files', '-z', '--', '.claude/skills') ?? '').split('\0').filter(Boolean).map((p) => p.split('/')[2]));

// What sits at .claude/skills/<name>, and what takes it out: all, only its name, or nothing here.
const entry = (repo, name, kept) => {
  const p = join(skillsDir(repo), name);
  const st = stat(p);
  if (!st) return null;
  if (kept.has(name)) return { text: 'committed with the repository', takes: 'never' };
  if (!st.isSymbolicLink()) return { text: st.isDirectory() ? 'a copy, or a version of its own' : 'a file', takes: 'never' };
  const clone = toClone(p);
  const which = [!real(p) && 'not there', !clone && 'no skill of a clone'].filter(Boolean).join(' and ');
  return { text: `a link to ${readlinkSync(p)}${which ? `, which is ${which}` : ''}`, takes: clone ? 'all' : 'name' };
};

const excludeOf = (repo) => { const p = git(repo, 'rev-parse', '--git-path', 'info/exclude'); return p ? (isAbsolute(p) ? p : join(repo, p)) : null; };
const excludeLines = (file) => { try { return readFileSync(file, 'utf8').split('\n'); } catch { return null; } };
const hasLine = (file, line) => (excludeLines(file) ?? []).some((l) => l.trimEnd() === line);
// Takes every copy of the line out of the file and leaves the rest of it as it was, ending on a
// newline, so that a line added later by hand with echo >> starts a line of its own.
const takeLineOut = (file, line) => {
  const lines = excludeLines(file);
  if (!lines) return false;
  const kept = lines.filter((l) => l.trimEnd() !== line);
  if (kept.length === lines.length) return false;
  const rest = kept.join('\n');
  writeFileSync(file, rest && !rest.endsWith('\n') ? `${rest}\n` : rest);
  return true;
};
// Every worktree of a repository shares its exclude file, so a line stays while another worktree
// still has something at its path.
const otherWorktrees = (repo) => (git(repo, 'worktree', 'list', '--porcelain') ?? '').split('\n')
  .filter((l) => l.startsWith('worktree ')).map((l) => l.slice('worktree '.length)).filter((w) => real(w) !== repo);
// The .claude/skills/<name> lines of the exclude file whose path holds nothing in any worktree: what a
// link taken out by hand leaves behind.
const LINE = /^\.claude\/skills\/([^/*?[\]\\]+)$/;
const leftBehind = (repo, file) => {
  const trees = [repo, ...otherWorktrees(repo)];
  const held = (excludeLines(file) ?? []).map((l) => l.trimEnd().match(LINE)?.[1]).filter(Boolean);
  return [...new Set(held)].filter((n) => !trees.some((w) => stat(join(skillsDir(w), n))));
};

// Takes the link at .claude/skills/<name> out of the repository and its line out of the exclude file,
// or says what is there instead and leaves both. True where a link came out.
const unlinkFrom = (repo, name, kept, exclude) => {
  const dest = join(skillsDir(repo), name);
  const line = `.claude/skills/${name}`;
  const where = exclude ? shown(exclude) : 'the exclude file';
  const st = stat(dest);
  if (st && kept.has(name)) { out(`${name}: skipped, ${shown(dest)} is committed with the repository, left as it is: only a link kept out of the history comes out`); return false; }
  if (st && !st.isSymbolicLink()) {
    out(`${name}: skipped, ${shown(dest)} is ${entry(repo, name, kept).text}, left as it is${hasLine(exclude, line) ? `, and so is its line in ${where}` : ''}: only a link comes out`);
    return false;
  }
  if (st) {
    const to = readlinkSync(dest);
    const gone = real(dest) ? '' : ', which is not there';
    try { unlinkSync(dest); } catch (e) { out(`${name}: could not take out ${shown(dest)} (${e.code ?? e.message}), left as it is with its exclude line`); failed = true; return false; }
    out(`${name}: unlinked ${shown(dest)}, a link to ${to}${gone}`);
  }
  const head = st ? `${name}:` : `${name}: no link at ${shown(dest)};`;
  const others = otherWorktrees(repo).filter((w) => stat(join(skillsDir(w), name)));
  if (others.length) out(`${head} kept ${line} in ${where}, since the worktree at ${others.join(', ')} still has ${line}`);
  else {
    let took = false, broke = false;
    try { took = Boolean(exclude) && takeLineOut(exclude, line); } catch (e) { out(`${head} could not edit ${where} (${e.code ?? e.message}), so ${line} is still in it`); failed = broke = true; }
    if (took) out(`${head} took ${line} out of ${where}`);
    else if (!broke) out(st ? `${name}: ${line} was not in ${where}` : `${name}: nothing to take out, no link at ${shown(dest)} and no ${line} in ${where}`);
  }
  if (st && stat(join(userDir, name))) out(`${name}: note, ${join(userDir, name)} exists, so /${name} still runs in this project, from the user level`);
  return Boolean(st);
};

// With nothing at all, a project loses every link to a skill of a clone, as with all; the clone, the
// repository /link-skill installs both skills from, takes those user-level links out, then helps.
const bare = names.length === 0 && !wantHelp;
const cwdRoot = repoRoot(process.cwd());
const inClone = Boolean(cwdRoot) && isClone(cwdRoot);

const usage = () => {
  out('usage: in a project, unlink.mjs [<skill>... | all]; in the clone, unlink.mjs <skill>... <project>, or all <project>;');
  out('       a project is a path, or the name of a folder beside the clone; all takes out every link to a skill of a clone;');
  out(`       with nothing at all, a project loses every such link, and the clone takes ${USER_LEVEL.map((n) => `/${n}`).join(' and ')} out of the user level`);
};
if (!cwdRoot && (bare || wantHelp)) { usage(); process.exit(0); }
if (!cwdRoot) fail('run this inside a git repository: the project that holds the links, or the Claude-Skills clone with the project named last');

// A repository named by a path, or by the name of a folder beside `beside`.
const findRepo = (arg, beside) => {
  const p = expand(arg);
  const tries = p.includes('/') || p.startsWith('.') ? [resolve(process.cwd(), p)] : [join(dirname(beside), p), resolve(process.cwd(), p)];
  for (const t of tries) if (existsSync(t)) { const r = repoRoot(t); if (r) return r; }
  return null;
};

let project = cwdRoot;
if (inClone) {
  project = null;
  const last = names[names.length - 1];
  if (last !== undefined && last !== 'all' && !skillsIn(cwdRoot).includes(last)) {
    const arg = names.pop();
    project = findRepo(arg, cwdRoot);
    if (!project) fail(`${arg} is neither a skill of this clone nor a repository: give the project's path, or the name of a folder beside this clone`);
  }
}
for (const n of names) {
  if (n !== 'all' && (/[/\\]/.test(n) || n === '.' || n === '..')) fail(`${n} is not a skill's name: give the name of its link under .claude/skills${inClone ? ', with the project last' : ''}`);
}

if (inClone && bare) {
  const gone = [];
  for (const n of USER_LEVEL) {
    const at = join(userDir, n);
    const st = stat(at);
    if (!st) { out(`${n}: ${at} is not there, so there is nothing to take out of the user level`); continue; }
    if (!st.isSymbolicLink()) { out(`${n}: skipped, ${at} is ${st.isDirectory() ? 'a copy' : 'a file'}, left as it is: only a link comes out`); continue; }
    const to = readlinkSync(at);
    try { unlinkSync(at); out(`${n}: unlinked ${at}, a link to ${to}`); gone.push(n); }
    catch (e) { out(`${n}: could not take out ${at} (${e.code ?? e.message}), left as it is`); failed = true; }
  }
  if (gone.length) {
    const one = gone.length === 1;
    const here = gone.every((n) => stat(join(skillsDir(cwdRoot), n)));
    out(`at the user level, ${gone.map((n) => `/${n}`).join(' and ')} no longer run${one ? 's' : ''}${here ? `; ${one ? 'it still runs' : 'both still run'} in this clone, from its own .claude/skills, where a bare /link-skill links ${one ? 'it' : 'them'} at the user level again` : ''}`);
  }
}

const needProject = inClone && !project && names.length > 0;
if (wantHelp || needProject || (inClone && names.length === 0)) {
  if (needProject) out('the project is needed: its path, or the name of a folder beside this clone, last');
  usage();
  if (project) {
    const kept = committed(project);
    const dir = skillsDir(project);
    const all = listed(dir);
    out(`in ${shown(dir)}:`);
    if (all.length === 0) out('  (nothing)');
    for (const n of all) {
      const e = entry(project, n, kept);
      if (e) out(`  ${n.padEnd(20)} ${e.text}: ${e.takes === 'all' ? 'all takes it out' : e.takes === 'name' ? 'taken out only when named' : 'stays'}`);
    }
    const exclude = excludeOf(project);
    const left = leftBehind(project, exclude);
    if (left.length) out(`  left behind in ${shown(exclude)} with no link, which all takes out: ${left.map((n) => `.claude/skills/${n}`).join(', ')}`);
  } else {
    out(`in the clone ${cwdRoot}`);
    const parent = dirname(cwdRoot);
    const rows = listed(parent).filter((n) => n !== basename(cwdRoot) && existsSync(join(parent, n, '.git')))
      .map((n) => { const r = real(join(parent, n)); const kept = committed(r); return [n, listed(skillsDir(r)).filter((s) => entry(r, s, kept)?.takes === 'all')]; })
      .filter(([, l]) => l.length > 0);
    out("repositories beside the clone that link a clone's skills, by name, which all <name> takes out:");
    if (rows.length === 0) out('  (none)');
    for (const [n, l] of rows) out(`  ${n.padEnd(20)} ${l.join(', ')}`);
  }
  for (const n of USER_LEVEL) {
    const at = join(userDir, n);
    const st = stat(at);
    out(`at the user level, ${at} is ${!st ? 'not there' : st.isSymbolicLink() ? `a link to ${readlinkSync(at)}, which a bare run ${inClone ? 'here' : 'in the clone'} takes out` : st.isDirectory() ? 'a copy' : 'a file'}`);
  }
  process.exit(needProject ? 2 : failed ? 1 : 0);
}

const kept = committed(project);
const exclude = excludeOf(project);
const everything = bare || names.includes('all');
const named = names.filter((n) => n !== 'all');
const found = everything ? listed(skillsDir(project)).filter((n) => entry(project, n, kept)?.takes === 'all') : [];
const left = everything ? leftBehind(project, exclude) : [];
const targets = [...new Set([...found, ...left, ...named])].sort();
if (everything) {
  const lead = bare ? 'nothing named, so ' : '';
  if (found.length) out(`${lead}every link to a skill of a Claude-Skills clone: ${found.join(', ')}`);
  if (left.length) out(`${found.length ? 'and ' : lead}every line in ${shown(exclude)} left behind with no link: ${left.map((n) => `.claude/skills/${n}`).join(', ')}`);
  if (!found.length && !left.length) out(`nothing in ${shown(skillsDir(project))} links to a skill of a Claude-Skills clone, and no line in ${exclude ? shown(exclude) : 'the exclude file'} is left behind`);
}
const removed = targets.filter((n) => unlinkFrom(project, n, kept, exclude));
if (everything) {
  for (const n of listed(skillsDir(project))) {
    if (targets.includes(n)) continue;
    const e = entry(project, n, kept);
    if (e) out(`${n}: stays, ${e.text}${e.takes === 'name' ? '; naming it takes it out' : ''}`);
  }
}
if (removed.length) out(`unlinked from ${project}: ${removed.map((n) => `/${n}`).join(', ')}`);
process.exit(failed ? 1 : 0);
