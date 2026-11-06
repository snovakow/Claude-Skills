#!/usr/bin/env node
// Helper for the /link-skill skill: links a skill of the Claude-Skills clone into a project's
// .claude/skills and keeps the link out of the project's history, which the clone's README gives as
// three commands to run by hand, with their arguments worked out from where it is run; and links
// this skill itself at the user level. It makes a folder, a link and one line in the project's
// exclude file, and removes nothing. Node 18 or later, no dependencies.
//
//     node link.mjs                            with nothing at all: link this skill itself at the user
//                                              level where it is not there yet, then the help: where it
//                                              is, the clone's skills, the links in place
//     node link.mjs <skill>... <project>       in the clone: link into the project, given as a path or as
//                                              the name of a folder beside the clone
//     node link.mjs <skill>... [<clone>]       in a project: link from the clone, given as a path or as
//                                              the name of a folder beside the project; with none, the
//                                              clone this script lives in, or a Claude-Skills folder
//                                              beside the project where the script is a copy
//     node link.mjs all [<repository>]         every skill of the clone
//     node link.mjs install                    link this skill itself at ~/.claude/skills/link-skill, the
//                                              user level, so that it runs in every repository, and
//                                              nothing else; --help is the help and nothing else

import { appendFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, symlinkSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = 'link-skill';
const args = process.argv.slice(2);
const names = args.filter((a) => !a.startsWith('-'));
const wantHelp = args.some((a) => a === '--help' || a === '-h');

const out = (s) => console.log(s);
const fail = (s) => { console.error(s); process.exit(2); };
const expand = (p) => (p === '~' ? homedir() : p.startsWith('~/') ? join(homedir(), p.slice(2)) : p);
const real = (p) => { try { return realpathSync(p); } catch { return null; } };
const git = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const repoRoot = (dir) => { const r = git(dir, 'rev-parse', '--show-toplevel'); return r ? real(r) : null; };
const skillsIn = (clone) => { try { return readdirSync(join(clone, 'skills')).filter((n) => existsSync(join(clone, 'skills', n, 'SKILL.md'))).sort(); } catch { return []; } };
const isClone = (dir) => Boolean(dir) && skillsIn(dir).length > 0;
const shown = (p) => { const r = relative(process.cwd(), p); return r && !r.startsWith('..') ? r : p; };
const description = (clone, name) => {
  const m = readFileSync(join(clone, 'skills', name, 'SKILL.md'), 'utf8').match(/^description:\s*(.*)$/m);
  const first = (m ? m[1].trim() : '').split(/(?<=\.)\s/)[0];
  return first.length > 90 ? `${first.slice(0, 87)}...` : first;
};

// Where this script lives: <clone>/skills/link-skill/scripts/link.mjs, through any link to it. Four
// levels above a copy is the .claude folder holding it, which has skills of its own but is no clone.
const ownClone = (() => { const c = dirname(dirname(dirname(dirname(real(fileURLToPath(import.meta.url)))))); return isClone(c) && basename(c) !== '.claude' ? c : null; })();
const userDir = join(homedir(), '.claude', 'skills');

// Places a link at dest to src, or says what is there instead. True where the link is in place.
const place = (name, src, dest) => {
  let st = null; try { st = lstatSync(dest); } catch { /* nothing there */ }
  if (!st) { symlinkSync(src, dest); out(`${name}: linked ${shown(dest)} -> ${src}`); return true; }
  if (st.isSymbolicLink()) {
    const to = readlinkSync(dest);
    if (real(dest) === real(src)) { out(`${name}: already linked, ${shown(dest)} -> ${to}`); return true; }
    out(`${name}: skipped, ${shown(dest)} is a link to ${to}; take it out first (rm ${shown(dest)}), then run again`); return false;
  }
  if (st.isDirectory()) { out(`${name}: skipped, ${shown(dest)} is a copy, or a version of its own; move it out of ${shown(dirname(dest))} first, then run again`); return false; }
  out(`${name}: skipped, ${shown(dest)} is a file; take it out first, then run again`); return false;
};

// Nothing at all is never a linking command, so it installs this skill where it is not there yet, then helps.
const bare = names.length === 0 && !wantHelp;
if (names[0] === 'install' || bare) {
  if (names.length > 1) fail('install takes no other argument: it links this skill itself at the user level');
  const cannot = `this copy of the skill lives in no clone, so it cannot install itself as a link: run the clone's own, or link skills/${SELF} by hand`;
  if (!ownClone && !bare) fail(cannot);
  if (!ownClone) out(cannot);
  else {
    mkdirSync(userDir, { recursive: true });
    const placed = place(SELF, join(ownClone, 'skills', SELF), join(userDir, SELF));
    if (placed) out(`at the user level, /${SELF} now runs the clone's version at ${ownClone} in every repository`);
    if (!bare) process.exit(placed ? 0 : 1);
  }
}

const usage = () => {
  out('usage: in the clone, link.mjs <skill>... <project>; in a project, link.mjs <skill>... [<clone>]; all for every skill;');
  out('       a repository is a path, or the name of a folder beside the repository this runs in; install links this skill at the user level');
};
const cwdRoot = repoRoot(process.cwd());
if (!cwdRoot && bare) { usage(); process.exit(0); }
if (!cwdRoot) fail('run this inside a git repository: the Claude-Skills clone, or the project that gets the skill');
const inClone = isClone(cwdRoot);

// A repository named by a path, or by the name of a folder beside `beside`.
const findRepo = (arg, beside) => {
  const p = expand(arg);
  const tries = p.includes('/') || p.startsWith('.') ? [resolve(process.cwd(), p)] : [join(dirname(beside), p), resolve(process.cwd(), p)];
  for (const t of tries) if (existsSync(t)) { const r = repoRoot(t); if (r) return r; }
  return null;
};

let clone, project;
if (inClone) {
  clone = cwdRoot;
  const last = names[names.length - 1];
  const repoArg = last !== undefined && last !== 'all' && !skillsIn(clone).includes(last) ? names.pop() : undefined;
  if (repoArg !== undefined) {
    project = findRepo(repoArg, clone);
    if (!project) fail(`${repoArg} is neither a skill of this clone nor a repository: give the project's path, or the name of a folder beside this clone`);
  }
} else {
  project = cwdRoot;
  const beside = join(dirname(project), 'Claude-Skills');
  const fallback = ownClone ?? (isClone(beside) ? real(beside) : null);
  const last = names[names.length - 1];
  const repoArg = last !== undefined && last !== 'all' && !(fallback && skillsIn(fallback).includes(last)) ? names.pop() : undefined;
  if (repoArg !== undefined) {
    clone = findRepo(repoArg, project);
    if (!clone || !isClone(clone)) fail(`${repoArg} is neither a skill${fallback ? ` of ${fallback}` : ''} nor a Claude-Skills clone: give the clone's path, or the name of a folder beside this project`);
  } else clone = fallback;
  if (!clone) fail("no Claude-Skills clone found: this script is not inside one and none is beside this project, so give the clone's path");
}

const skills = names.includes('all') ? skillsIn(clone) : names;
const missing = inClone && !project && skills.length > 0 ? 'the project is needed: its path, or the name of a folder beside this clone' : '';
if (wantHelp || skills.length === 0 || missing) {
  if (missing) out(missing);
  usage();
  out(inClone ? `in the clone ${clone}${project ? `, for the project ${project}` : ''}` : `in the project ${project}, with the clone ${clone}`);
  out('skills in the clone:');
  for (const n of skillsIn(clone)) out(`  ${n.padEnd(20)} ${description(clone, n)}`);
  if (project) {
    const dir = join(project, '.claude', 'skills');
    let entries = []; try { entries = readdirSync(dir).sort(); } catch { /* no skills folder yet */ }
    out(`in ${shown(dir)}:`);
    if (entries.length === 0) out('  (nothing)');
    for (const n of entries) {
      let st; try { st = lstatSync(join(dir, n)); } catch { continue; }
      out(`  ${n.padEnd(20)} ${st.isSymbolicLink() ? `link to ${readlinkSync(join(dir, n))}` : st.isDirectory() ? 'a copy, or a version of its own' : 'a file'}`);
    }
  } else {
    const parent = dirname(clone);
    const beside = readdirSync(parent).filter((n) => n !== basename(clone) && existsSync(join(parent, n, '.git'))).sort();
    out(`repositories beside the clone, by name: ${beside.join(', ') || '(none)'}`);
  }
  const self = join(userDir, SELF);
  let st = null; try { st = lstatSync(self); } catch { /* not there */ }
  out(`at the user level, ${self} is ${!st ? `not there: \`install\`, or nothing at all, puts a link to the clone there, so that /${SELF} runs in every repository` : st.isSymbolicLink() ? (real(self) === real(join(clone, 'skills', SELF)) ? 'a link to this clone' : `a link to ${readlinkSync(self)}`) : st.isDirectory() ? 'a copy' : 'a file'}`);
  process.exit(missing ? 2 : 0);
}

const unknown = skills.filter((n) => !skillsIn(clone).includes(n));
if (unknown.length) fail(`not a skill of ${clone}: ${unknown.join(', ')}; its skills are ${skillsIn(clone).join(', ')}`);

const skillsDir = join(project, '.claude', 'skills');
mkdirSync(skillsDir, { recursive: true });
const excludePath = git(project, 'rev-parse', '--git-path', 'info/exclude');
const excludeFile = isAbsolute(excludePath) ? excludePath : join(project, excludePath);
const linked = [];
for (const name of skills) {
  const src = join(clone, 'skills', name);
  if (!place(name, src, join(skillsDir, name))) continue;
  const line = `.claude/skills/${name}`;
  mkdirSync(dirname(excludeFile), { recursive: true });
  const text = existsSync(excludeFile) ? readFileSync(excludeFile, 'utf8') : '';
  if (text.split('\n').includes(line)) out(`${name}: ${line} is already in ${shown(excludeFile)}`);
  else { appendFileSync(excludeFile, `${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`); out(`${name}: added ${line} to ${shown(excludeFile)}`); }
  const user = join(userDir, name);
  if (existsSync(user) && real(user) !== real(src)) out(`${name}: note, ${user} exists and runs in place of this link in every project`);
  linked.push(name);
}
if (linked.length) out(`in ${project}, ${linked.map((n) => `/${n}`).join(', ')} now run${linked.length === 1 ? 's' : ''} the clone's version at ${clone}`);
