# deploy

A `/deploy` skill for Claude Code, for a site that is built with `npm run build` and served from
a folder on the machine that holds its checkout. It builds a clean copy of `main`, copies the
build into the live folder in an order that is safe while the site is being visited, and removes
the asset files older builds left behind. A project whose deploy is more than its build adds the
rest in a settings file of its own.

The whole deploy is one script, [scripts/deploy.mjs](scripts/deploy.mjs), which also runs from a
terminal with no thread at all. The skill is the command, its permission and the report.

## Install

Link it. Nothing in the skill is adapted per project: what a project adds lives in the project,
in the settings file below, so every project runs the same core and there is no copy to keep
current. `/link-skill deploy /path/to/project` from the clone, or `/link-skill deploy` from the
project, makes the link; by hand, from the root of this repository:

```bash
mkdir -p /path/to/project/.claude/skills
ln -sn "$PWD/skills/deploy" /path/to/project/.claude/skills/deploy
echo .claude/skills/deploy >> /path/to/project/.git/info/exclude
```

Then say where the live folder is. A path on this machine never enters a project's history, so
it is split in two: the machine says where its live folders are, once for every project,

```bash
git config --global deploy.liveRoot /path/to/the/live/folders
```

and the project names its own folder there, in its settings file:

```js
// .claude/deploy.config.mjs
export default {
  liveName: 'mysite',
};
```

A bare `/deploy` then goes to `/path/to/the/live/folders/mysite`, from any clone on any machine
that has the setting. A clone can name the whole folder itself instead, which comes first:

```bash
git config deploy.live /path/to/the/live/folder
```

A project whose settings file finds the folder itself needs neither. The folder has to exist; the
first deploy fills an empty one.

The script needs Node 18 or later, `git`, `tar` and `npm`, and nothing else. The skill runs by
hand only, and its `allowed-tools` pre-approve the one command.

## Usage

```
/deploy                      deploy main
/deploy --dry-run            build, and list what would be copied and removed
/deploy --branch <name>      deploy another local branch's committed state
/deploy --live <dir>         use this live folder for the one run
```

From a terminal in the project, the same arguments go to
`node .claude/skills/deploy/scripts/deploy.mjs`.

## What a run does

1. **Picks the branch.** `main`, unless `--branch` names another. It never switches branches: it
   reads the branch's commit straight from git, so the build is the same whatever is checked
   out, and uncommitted work cannot reach the live folder. It says so where the branch has
   unpushed commits, where the checked-out branch holds commits the deployed one lacks, and where
   the deployed branch is checked out with uncommitted changes.
2. **Finds the live folder**: `--live`, then the project's own `locate`, then the clone's
   `deploy.live` setting, then the project's `liveName` under the machine's `deploy.liveRoot`.
   It stops before building where there is none, where the folder is missing, inside the checkout
   or a checkout itself, or where it holds files but no `index.html`.
3. **Builds a clean copy.** `git archive` of the commit into a temp folder, then `npm ci` and
   `npm run build` there. The build has exactly the packages the lockfile pins and only tracked
   files, and the checkout's `node_modules` and build folder are left alone. A failed build
   copies nothing. The temp folder is fixed per project, since a bundler can name a file after
   the folder it was built in, and is removed at the end.
4. **Copies what differs**, each file written beside its target and renamed over it, so nothing
   is served half-written: the assets first, which are new names beside the old ones; then the
   site's other files; then `index.html`, which is what moves a visitor to the new build; then
   the project's extra steps. A file whose bytes already match is skipped, and a front end whose
   assets and index match the live ones under other names, and whose other files match too,
   counts as already live.
5. **Checks what landed**: every copied file against the build, and what the site's pages load,
   `index.html` and the build's other pages, against the live folder. A page that loads a file
   from the assets folder that isn't there stops the deploy. Any other file a page loads that
   isn't there is only noted, since a deploy removes nothing outside the assets folder. Only a
   path relative to the page counts as missing: where a path from the site's root lands depends
   on where the site is served.
6. **Removes older asset files**, only after that check, and never one the site's pages still
   reach, by loading it or through the scripts and styles they load. The ones they reached
   before the deploy stay until the next deploy, since a visitor who opened a page before the
   switch can still ask for them, such as the code of a route not yet visited. Nothing outside
   the assets folder is ever removed.

## A project's settings file

`.claude/deploy.config.mjs`, tracked with the project and read from the checkout, as the skill
itself is. Its default export may hold any of:

| | |
|---|---|
| `liveName` | The project's folder under the machine's `deploy.liveRoot`: a name, such as `'mysite'`, never a path on a machine. |
| `neverCopy` | Top-level names in the live folder that the server owns, such as a data folder it writes. A build that holds them never overwrites them. |
| `outDir`, `assetsDir` | Where `npm run build` writes, and the folder in it for files named by their content: `dist` and `assets` unless set. |
| `options` | Names of extra options that take a value, such as `['update']` for `--update <dir>`. |
| `locate({ repoRoot, options })` | Finds the live folder in place of the settings, and returns `{ liveDir }` with whatever else the steps need. |
| `steps(ctx)` | Extra steps, run in order after the site's own files. Each is `{ files: [{ from, to, label }], before }`. |

`steps` gets `{ repoRoot, src, out, liveDir, located, files, options, dryRun }`: `src` is the
built commit's files, `out` its build output, `files` the build's paths, and `located` what
`locate` returned. A step's files come from `src` or `out`, so a step deploys committed work
only, and can go anywhere outside the checkout, such as a second folder the server reads; both
are absolute paths. A file a step puts in the live folder is left out of the site's own copy,
which is how a project moves a file later in the order, say server code that has to land
together. `before`, where a step has one, runs just ahead of that step's copies and only when it
has some, for a deploy that has to wait for a safe moment. An error thrown by `locate` or `steps`
stops the deploy with its message before anything is copied, and so does a step's file that
breaks these rules.

A minimal one, for a site whose server writes into a `data` folder beside the build:

```js
export default {
  neverCopy: ['data'],
};
```

## Keeping a copy current

Link it instead: a project's own part is its settings file, so a copy has nothing to adapt.
Where a copy exists all the same, its frontmatter's `metadata.baseline` is the date it was
adapted from, and the diff of `SKILL.md` and `scripts/deploy.mjs` against this repository shows
the drift, as with the other skills.
