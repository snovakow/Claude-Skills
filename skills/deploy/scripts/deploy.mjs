#!/usr/bin/env node
// Helper for the /deploy skill: deploys a branch of the project to its live folder on this machine.
// It builds the branch's committed files in a temp folder with npm ci and npm run build, then copies
// the build into the live folder, skipping files that already match, and removes the asset files
// older builds left behind. It never touches the checkout or its build folder. Node 18 or later, no
// dependencies.
//
//     node deploy.mjs [--branch <name>] [--dry-run] [--live <dir>]
//
// main is deployed unless --branch names another branch. Whatever is checked out, and any
// uncommitted change, stays out of it.
//
// Where the live folder is never enters the project's history, since it is a path on this machine.
// The machine says where its live folders are, once, and the project's settings file names its own
// folder there with liveName:    git config --global deploy.liveRoot <dir>
// Or the clone names the whole folder itself, which comes first:    git config deploy.live <dir>
//
// A project adds to the deploy with .claude/deploy.config.mjs, read from the checkout. Its default
// export may hold any of:
//
//     liveName    the project's folder under this machine's deploy.liveRoot, such as 'mysite'
//     neverCopy   top-level names in the live folder that the server owns; a build that holds them
//                 never overwrites them
//     outDir      the folder npm run build writes, 'dist' unless set
//     assetsDir   the folder in it for files named by their content, 'assets' unless set
//     options     names of extra options that take a value, such as ['update'] for --update <dir>
//     locate      ({ repoRoot, options }) => { liveDir, ... }: finds the live folder in place of the
//                 settings; whatever else it returns reaches steps as ctx.located
//     steps       (ctx) => [{ files: [{ from, to, label }], before }]: extra steps, run in order
//                 after the site's own files. ctx is { repoRoot, src, out, liveDir, located, files,
//                 options, dryRun }, with src the built commit's files and out its build output. A
//                 file's from is a file under src or out, so a step copies committed work only, and
//                 its to an absolute path outside the checkout. A file a step puts in the live
//                 folder is left out of the site's own copy, so a step can also move a file later in
//                 the order. before, where a step has one, runs just ahead of that step's copies,
//                 and only when it has some.
//
// An error thrown by locate or steps stops the deploy with its message, before anything is copied,
// and so does a step's file that breaks those rules.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const CONFIG = '.claude/deploy.config.mjs';
const SETTING = 'deploy.live';
const ROOT_SETTING = 'deploy.liveRoot';

class Stop extends Error {}
const stop = (text) => { throw new Stop(text); };
const say = (text = '') => console.log(text);

const run = (command, commandArgs, extra = {}) => execFileSync(command, commandArgs, {
  encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'], ...extra,
});
const tryRun = (command, commandArgs) => { try { return run(command, commandArgs).replace(/\n$/, ''); } catch { return null; } };
const git = (...gitArgs) => tryRun('git', gitArgs);
const expand = (path, from = '.') => resolve(from, path === '~' ? homedir() : path.startsWith('~/') ? join(homedir(), path.slice(2)) : path);
const inside = (dir, path) => { const rel = relative(dir, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); };
const decoded = (text) => { try { return decodeURI(text); } catch { return text; } };
const statOf = (path) => { try { return statSync(path); } catch { return null; } };
const isFile = (path) => !!path && !!statOf(path)?.isFile();
const isDir = (path) => !!path && !!statOf(path)?.isDirectory();
const listDir = (path) => { try { return readdirSync(path); } catch { return []; } };
const readText = (path) => { try { return readFileSync(path, 'utf8'); } catch { return null; } };
const sameBytes = (a, b) => { try { return readFileSync(a).equals(readFileSync(b)); } catch { return false; } };
const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const plural = (count, word, many = `${word}s`) => `${count} ${count === 1 ? word : many}`;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };

// Every file under a folder, as paths relative to it, skipping Finder's .DS_Store
const walk = (root) => {
  const files = [];
  const visit = (dir, prefix) => {
    for (const name of listDir(dir)) {
      if (name === '.DS_Store') continue;
      const path = join(dir, name);
      const relativePath = prefix ? `${prefix}/${name}` : name;
      const info = statOf(path);
      if (info?.isDirectory()) visit(path, relativePath);
      else if (info?.isFile()) files.push(relativePath);
    }
  };
  visit(root, '');
  return files.sort();
};

// Writes beside the target, then renames over it, so nothing ever loads a half-written file
const copied = [];
const place = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  const temp = join(dirname(to), `.${basename(to)}.deploy-${process.pid}`);
  try {
    copyFileSync(from, temp);
    renameSync(temp, to);
    copied.push(to);
  } catch (error) {
    try { unlinkSync(temp); } catch { /* never written */ }
    throw error;
  }
};

// Runs a build step, and on failure stops with the end of its output
const buildStep = (label, command, commandArgs, cwd) => {
  const begin = Date.now();
  try {
    run(command, commandArgs, { cwd, timeout: 15 * 60 * 1000 });
  } catch (error) {
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.trim().split('\n').slice(-25).join('\n');
    stop(`${label} failed, so nothing was copied:\n${output || error.message}`);
  }
  return (Date.now() - begin) / 1000;
};

// A project's own hook: whatever it throws stops the deploy with its message
const hook = async (name, call) => {
  try {
    return await call();
  } catch (error) {
    if (error instanceof Stop) throw error;
    return stop(`${CONFIG}, ${name}: ${error?.message ?? error}`);
  }
};

let buildDir = null;

const deploy = async () => {
  const startDir = process.cwd();
  const repoRoot = git('rev-parse', '--show-toplevel') ?? stop('Run this inside the project\'s checkout');
  process.chdir(repoRoot);

  // The project's additions, read from the checkout as the skill itself is
  let config = {};
  if (isFile(join(repoRoot, CONFIG))) {
    const loaded = await hook('loading', () => import(pathToFileURL(join(repoRoot, CONFIG)).href));
    config = loaded.default ?? {};
  }
  const liveName = config.liveName ?? null;
  const neverCopy = config.neverCopy ?? [];
  const outName = config.outDir ?? 'dist';
  const assetsDir = `${config.assetsDir ?? 'assets'}/`;
  const extraOptions = config.options ?? [];

  // Options
  const usage = `Usage: deploy.mjs [--branch <name>] [--dry-run] [--live <dir>]${extraOptions.map((name) => ` [--${name} <value>]`).join('')}`;
  const options = { branch: 'main', dryRun: false, live: null };
  const args = process.argv.slice(2).flatMap((arg) => (/^--[\w-]+=/.test(arg) ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg]));
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = () => {
      const next = args[++index];
      if (!next || next.startsWith('-')) stop(`${arg} needs a value. ${usage}`);
      return next;
    };
    if (arg === '--branch') options.branch = value();
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--live') options.live = value();
    else if (arg === '--help' || arg === '-h') { say(usage); return; }
    else if (arg.startsWith('--') && extraOptions.includes(arg.slice(2))) options[arg.slice(2)] = value();
    else stop(`Unknown argument ${arg}. ${usage}`);
  }

  // The branch: its committed files, whatever is checked out
  const { branch } = options;
  const sha = git('rev-parse', '--verify', '-q', `refs/heads/${branch}^{commit}`) ?? stop(`There is no local branch ${branch}`);
  const read = (path) => git('show', `${sha}:${path}`);
  const packageText = read('package.json') ?? stop(`${branch} has no package.json, and the deploy builds with npm ci and npm run build`);
  if (read('package-lock.json') === null) stop(`${branch} has no package-lock.json, which npm ci needs`);
  let version = null;
  try { version = JSON.parse(packageText).version ?? null; } catch { /* not worth stopping for */ }
  say(`${options.dryRun ? 'Dry run of deploying' : 'Deploying'} ${branch} at ${sha.slice(0, 7)} "${git('log', '-1', '--format=%s', sha)}"${version ? `, version ${version}` : ''}`);
  if (git('rev-parse', '--verify', '-q', `refs/remotes/origin/${branch}`)) {
    const [ahead, behind] = (git('rev-list', '--left-right', '--count', `${sha}...origin/${branch}`) ?? '0 0').split(/\s+/).map(Number);
    if (ahead) say(`Note: ${branch} has ${plural(ahead, 'commit')} not pushed to origin/${branch}`);
    if (behind) say(`Note: ${branch} is ${plural(behind, 'commit')} behind origin/${branch}, as of the last fetch`);
  }
  const current = git('symbolic-ref', '--short', '-q', 'HEAD');
  if (current && current !== branch) {
    const waiting = Number(git('rev-list', '--count', `${sha}..${current}`) ?? 0);
    if (waiting) say(`Note: ${current}, checked out here, has ${plural(waiting, 'commit')} ${branch} doesn't; ${waiting === 1 ? 'it isn\'t' : 'they aren\'t'} part of this deploy`);
  }
  if (branch !== 'main') {
    if (git('rev-parse', '--verify', '-q', 'refs/heads/main^{commit}') === sha) say(`Note: ${branch} is at the same commit as main`);
    else say(`Note: this deploys ${branch}, not main`);
  }
  if (current === branch && git('status', '--porcelain', '--untracked-files=no')) {
    say(`Note: the working tree has uncommitted changes; only what's committed on ${branch} is deployed`);
  }

  // The live folder: an option, the project's own way of finding it, this clone's setting, or the
  // folder the project names under this machine's root
  let located = {};
  let liveDir = options.live ? expand(options.live, startDir) : null;
  if (config.locate) {
    located = (await hook('locate', () => config.locate({ repoRoot, options }))) ?? {};
    liveDir ??= located.liveDir ? expand(located.liveDir) : null;
  }
  const setting = git('config', '--get', SETTING);
  liveDir ??= setting ? expand(setting) : null;
  if (!liveDir && liveName !== null) {
    const plain = typeof liveName === 'string' && !isAbsolute(liveName) && !liveName.startsWith('~') && liveName.split(/[\\/]/).every((part) => part && part !== '.' && part !== '..');
    if (!plain) stop(`${CONFIG}, liveName: ${JSON.stringify(liveName)} isn't a folder name. A path on this machine goes in a setting, never in the project`);
    const root = git('config', '--get', ROOT_SETTING);
    if (!root) stop(`This machine doesn't say where its live folders are; the project names its own there, ${liveName}. Set it once, then run this again:\n    git config --global ${ROOT_SETTING} <dir>`);
    liveDir = join(expand(root), liveName);
  }
  if (!liveDir) stop(`This clone doesn't say where the live folder is. Set it once, then run this again:\n    git config ${SETTING} <dir>`);
  if (!isDir(liveDir)) stop(`The live folder ${liveDir} doesn't exist; make it first if this is the site's first deploy`);
  if (inside(repoRoot, liveDir)) stop(`${liveDir} is inside this checkout, not a deployed folder`);
  if (isDir(join(liveDir, '.git')) || isFile(join(liveDir, '.git'))) stop(`${liveDir} is a git checkout, not a deployed folder`);
  if (listDir(liveDir).some((name) => name !== '.DS_Store') && !isFile(join(liveDir, 'index.html'))) stop(`${liveDir} holds files but no index.html, so it doesn't look like the site's live folder`);
  say(`Live folder: ${liveDir}`);

  // The build, from a clean archive of the commit: only tracked files, so nothing the checkout holds
  // besides them. The folder is fixed per project, since a bundler can name a file after the folder it
  // was built in as well as its contents, and a fixed one keeps a commit's names the same between deploys
  buildDir = join(tmpdir(), `deploy-${basename(repoRoot)}-${createHash('sha256').update(repoRoot).digest('hex').slice(0, 8)}`);
  const lock = join(buildDir, 'pid');
  if (isDir(buildDir)) {
    const pid = Number(readText(lock));
    if (pid && pid !== process.pid && alive(pid)) { buildDir = null; stop(`Another deploy of this project is running (process ${pid})`); }
    rmSync(buildDir, { recursive: true, force: true });
  }
  const src = join(buildDir, 'src');
  mkdirSync(src, { recursive: true });
  writeFileSync(lock, String(process.pid));
  run('git', ['archive', '--format=tar', `--output=${join(buildDir, 'ref.tar')}`, sha]);
  run('tar', ['-xf', join(buildDir, 'ref.tar'), '-C', src]);
  const installTime = buildStep('npm ci', 'npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], src);
  const buildTime = buildStep('npm run build', 'npm', ['run', 'build'], src);
  const out = join(src, outName);
  if (!isFile(join(out, 'index.html'))) stop(`The build wrote no ${outName}/index.html, so nothing was copied`);
  say(`Build: npm ci in ${installTime.toFixed(1)} s, npm run build in ${buildTime.toFixed(1)} s`);

  const built = walk(out);
  const held = built.filter((path) => neverCopy.includes(path.split('/')[0]));
  if (held.length) say(`Note: the build holds ${[...new Set(held.map((path) => path.split('/')[0]))].join(', ')}, which a deploy never copies`);
  const files = built.filter((path) => !held.includes(path));

  // The project's extra steps, and the live files they take over from the site's own copy
  const steps = config.steps ? ((await hook('steps', () => config.steps({ repoRoot, src, out, liveDir, located, files, options, dryRun: options.dryRun }))) ?? []) : [];

  // A step's files: each one from the built commit, so only committed work is deployed, to an absolute path
  // outside the checkout. Checked before anything is copied, so a wrong one never leaves a deploy half done
  for (const { from, to } of steps.flatMap((step) => step.files ?? [])) {
    if (typeof from !== 'string' || !isAbsolute(from) || !inside(src, from)) stop(`${CONFIG}, steps: ${JSON.stringify(from)} isn't in the built commit; a step's files come from ctx.src or ctx.out, so only committed work is deployed`);
    if (!isFile(from)) stop(`${CONFIG}, steps: ${from} isn't a file`);
    if (typeof to !== 'string' || !isAbsolute(to)) stop(`${CONFIG}, steps: ${JSON.stringify(to)} isn't an absolute path`);
    if (inside(repoRoot, to)) stop(`${CONFIG}, steps: ${to} is inside this checkout, not a deployed folder`);
    if (isDir(to)) stop(`${CONFIG}, steps: ${to} is a folder, not a file to put in place`);
  }
  const claimed = new Set(steps.flatMap((step) => step.files ?? []).map((file) => relative(liveDir, resolve(file.to)).split('\\').join('/')).filter((path) => !path.startsWith('..')));
  const own = files.filter((path) => !claimed.has(path));
  const assets = own.filter((path) => path.startsWith(assetsDir));
  const others = own.filter((path) => !path.startsWith(assetsDir) && path !== 'index.html');

  // The front end is already live when every asset has a byte-identical live copy, under whatever name,
  // index.html matches the live one with those names swapped in, and the site's other files match too,
  // since a page among them would name the build's assets, which are then never copied
  const liveAssets = walk(join(liveDir, assetsDir)).map((path) => `${assetsDir}${path}`);
  const liveByDigest = new Map(liveAssets.map((path) => [digest(join(liveDir, path)), path]));
  const twins = new Map(assets.map((path) => [path, liveByDigest.get(digest(join(out, path)))]).filter(([, twin]) => twin));
  let frontEndLive = false;
  if (own.includes('index.html') && twins.size === assets.length && others.every((path) => sameBytes(join(out, path), join(liveDir, path)))) {
    let index = readText(join(out, 'index.html')) ?? '';
    for (const [path, twin] of twins) index = index.replaceAll(path, twin);
    frontEndLive = index === readText(join(liveDir, 'index.html'));
  }

  // What to copy, in order, leaving out files whose bytes already match: the assets, which are new names
  // beside the old ones; then the site's other files; then index.html, which is what moves a visitor to
  // the new build; then the project's steps
  const plan = [];
  let unchanged = 0;
  const add = (group, from, to, label) => {
    if (sameBytes(from, to)) unchanged += 1;
    else plan.push({ group, from, to, label });
  };
  const ownLabel = (path) => `${path} into the live folder`;
  if (frontEndLive) unchanged += assets.length;
  else for (const path of assets) add('site', join(out, path), join(liveDir, path), ownLabel(path));
  for (const path of others) add('site', join(out, path), join(liveDir, path), ownLabel(path));
  if (frontEndLive) unchanged += 1;
  else if (own.includes('index.html')) add('site', join(out, 'index.html'), join(liveDir, 'index.html'), ownLabel('index.html'));
  steps.forEach((step, number) => {
    for (const file of step.files ?? []) {
      const to = resolve(file.to);
      const rel = relative(liveDir, to);
      add(number, file.from, to, file.label ?? (rel.startsWith('..') ? to : ownLabel(rel)));
    }
  });

  // The asset files a page loads, and the ones it names that the live folder doesn't have. Only the assets
  // folder counts, since it is the part a deploy adds to and removes from: a commented-out tag, a data: URL or
  // another site's file names nothing there. A path from the site's root can start with the folder the site is
  // served from, so one that doesn't start at the assets folder counts only where it is found
  const loadedBy = (index) => {
    const found = [];
    const missing = [];
    for (const [, raw] of (index ?? '').replace(/<!--[\s\S]*?-->/g, '').matchAll(/\s(?:src|href)="([^"]+)"/g)) {
      const ref = decoded(raw.replace(/[?#].*$/, '')).replace(/^\.\//, '');
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue;
      const parts = ref.replace(/^\/+/, '').split('/');
      const tails = parts.map((_, at) => parts.slice(at).join('/')).filter((path) => path.startsWith(assetsDir));
      const path = tails.find((tail) => isFile(join(liveDir, tail)));
      if (path) found.push(path);
      else if (tails[0] === parts.join('/')) missing.push(raw);
    }
    return { found, missing };
  };

  // The asset files a page reaches: the ones it loads, and the ones their scripts and styles name in turn
  const reach = (index) => {
    const present = walk(join(liveDir, assetsDir)).map((path) => `${assetsDir}${path}`);
    const reached = new Set(loadedBy(index).found);
    for (const path of reached) {
      if (!/\.(?:js|css)$/.test(path)) continue;
      const text = readText(join(liveDir, path)) ?? '';
      for (const other of present) if (text.includes(basename(other))) reached.add(other);
    }
    return reached;
  };

  // Asset files from older builds. The ones the page live before this deploy reaches stay until the next
  // deploy, since a visitor who opened that page can still ask for them, such as the code of a route not yet
  // visited; the rest go once the copy checks out. A file a step puts in the assets folder is in use
  const inUse = new Set([...(frontEndLive ? twins.values() : assets), ...claimed]);
  const before = reach(readText(join(liveDir, 'index.html')));
  const stale = liveAssets.filter((path) => !inUse.has(path));
  const removable = stale.filter((path) => !before.has(path));
  const kept = stale.filter((path) => before.has(path));
  const indexChanges = plan.some(({ to }) => to === join(liveDir, 'index.html'));

  if (frontEndLive) say('Front end: already live');
  if (!plan.length) {
    say(`Nothing to copy; everything already matches ${branch} (${plural(unchanged, 'file')} checked)`);
  } else {
    say(`${options.dryRun ? 'Would copy' : 'Copying'}, in this order (${plural(unchanged, 'file')} already ${unchanged === 1 ? 'matches' : 'match'}):`);
    plan.forEach((item, index) => say(`  ${index + 1}. ${item.label}`));
  }
  if (options.dryRun) {
    if (removable.length) say(`Would remove ${plural(removable.length, 'older asset file')} once the copy checks out: ${removable.join(', ')}`);
    if (kept.length) say(indexChanges ? `Would keep ${plural(kept.length, 'asset file')} of the build live now until the next deploy, for a visitor still on it` : `Would keep ${plural(kept.length, 'older asset file')} the live front end still loads`);
    say('Dry run: nothing was copied');
    return;
  }

  // Copy
  for (const item of plan.filter(({ group }) => group === 'site')) place(item.from, item.to);
  for (let number = 0; number < steps.length; number += 1) {
    const items = plan.filter(({ group }) => group === number);
    if (!items.length) continue;
    if (steps[number].before) await hook('a step\'s before', () => steps[number].before({ say }));
    for (const item of items) place(item.from, item.to);
  }

  // Check what landed: every copied file matches the build, and the live index loads only asset files that exist
  const wrong = plan.filter((item) => !sameBytes(item.from, item.to));
  if (wrong.length) stop(`These don't match the build after copying: ${wrong.map((item) => item.label).join(', ')}`);
  const liveIndex = readText(join(liveDir, 'index.html'));
  const { missing } = loadedBy(liveIndex);
  if (missing.length) stop(`The live index.html loads ${missing.join(', ')}, which the live folder doesn't have`);
  if (plan.length) say(`Copied ${plural(plan.length, 'file')}; each one matches the build`);

  // Only after the deploy checks out: remove older asset files, but keep anything the live front end
  // still reaches, whatever the build says, and the build this one replaced until the next deploy
  if (stale.length) {
    const after = reach(liveIndex);
    const pruned = removable.filter((path) => !after.has(path));
    for (const path of pruned) unlinkSync(join(liveDir, path));
    const stillLoaded = stale.filter((path) => after.has(path)).length;
    const outgoing = stale.length - pruned.length - stillLoaded;
    if (pruned.length) say(`Removed ${plural(pruned.length, 'older asset file')}`);
    if (stillLoaded) say(`Kept ${plural(stillLoaded, 'older asset file')} the live front end still loads`);
    if (outgoing) say(`Kept ${plural(outgoing, 'asset file')} of the build this deploy replaced until the next one, for a visitor still on it`);
  }
  say(`Live: ${branch} at ${sha.slice(0, 7)}${version ? `, version ${version}` : ''}`);
};

let status = 0;
try {
  await deploy();
} catch (error) {
  console.error(error instanceof Stop ? error.message : `The deploy stopped: ${error?.stack ?? error}`);
  if (copied.length) console.error(`Copied before it stopped:\n${copied.map((path) => `  ${path}`).join('\n')}`);
  status = 1;
} finally {
  // Only this run's own build folder is removed
  if (buildDir && Number(readText(join(buildDir, 'pid'))) === process.pid && dirname(buildDir) === resolve(tmpdir())) {
    rmSync(buildDir, { recursive: true, force: true });
  }
}
process.exit(status);
