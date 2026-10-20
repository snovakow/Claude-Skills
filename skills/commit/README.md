# commit

A `/commit` skill for Claude Code. It reviews everything since the last reviewed point, fixes
what can still be fixed, commits the working tree as itemised commits with real messages, keeps
the README and docs true, and ends with a version commit where the project keeps them. It never
pushes: the user reviews the commits and pushes them.

It is the generic form of four project commit skills, which share one spine and differ in what
each project adds on top. This one keeps the spine and turns the additions into settings, so it
runs as it is in a new repository and grows into a project's own version by editing its two
settings blocks: one at the top of `SKILL.md`, and its twin at the top of the scan.

## Install

Copy the folder into the project and run `/commit` in Claude Code:

```bash
cp -R skills/commit /path/to/project/.claude/skills/commit
```

A copy at `~/.claude/skills/commit` works in every project; a project copy is the one to adapt.
`SKILL.md` names the scan as `${CLAUDE_SKILL_DIR}/scripts/scan.mjs`, and Claude Code substitutes
the skill's own folder for that variable, so the path holds wherever the skill is installed.
The skill runs by hand only, at Opus and max effort, and stops unless `/commit` is the first thing
in its thread, so the review starts from a clean context. The scan needs Node 18 or later and
nothing else. The skill's `allowed-tools` pre-approve the commands that change something in a
run, such as staging, committing and rebasing, and nothing broader; read-only git needs no
grant. A push, a publish or an `npx` download therefore goes through the session's usual
permission check.

## What a run does

The review covers everything after the baseline: the last version commit where the project
keeps them, otherwise the newest pushed commit, so that pushing is what closes a run. In that
case the run asks before reading anything committed above the pushed tip, since nothing in the
repository says whether a thread committed it unreviewed or a previous run left it unpushed; the
answer can name the last commit to keep, and the review starts after it. A version commit is the
stronger checkpoint: it lives in the history and travels with every clone, so a forgotten push
costs nothing and a commit made by hand is still reviewed at the next release.

1. **Survey.** Fetches, runs `scripts/scan.mjs`, and stops on anything that needs the user: an
   operation in progress, a detached HEAD, a protected branch, a version changed by hand,
   credentials in added lines, files that look like they should not be tracked.
2. **Review.** Reads every commit since the baseline, the working-tree diff and every untracked
   file. Checks messages against diffs, comments against code, and prose for references a public
   reader cannot follow. Runs the project's checks for what changed.
3. **Fix.** Rewrites only unpushed commits above the baseline, by amending the tip or by `fixup!`
   and `amend!` commits folded with one autosquash rebase, and checks that the fold changed no
   tree.
4. **Commit.** Plans the whole batch first, one concern per commit, the file as the unit, ordered
   so every commit stands on its own. Stages explicit paths only.
5. **Docs.** Updates the maintained docs where a change makes them untrue, describing the idea
   rather than restating the code.
6. **Version.** Ends with a version commit when the project keeps them: a one-line message,
   only the version files, no trailer. Where the project has a changelog, the commit also
   carries a new section for the number. It is the next run's baseline.
7. **Report.** Flags first, then each commit, what was left out and why, the checks that ran, and
   the undo point. Nothing is pushed.

## With the other skills

A milestone of an execution plan (`/execution-runbook` writes one, `/executioner` runs it) is one
or a few ordinary content commits made by the milestone's thread; this skill is the release the
plan's Commit lines name afterwards. It runs in a fresh thread, as its rules say, with the version
passed once at a release line's first release and left to the bump after that, and the next
milestone's review reads the changelog section it wrote for what the review corrected.

## Settings

Two places hold the settings and must agree: the **Project settings** block at the top of
`SKILL.md`, which the model reads, and the settings block at the top of `scripts/scan.mjs`, which
the scan reads.

| Setting | In SKILL.md | In scan.mjs | Default |
| --- | --- | --- | --- |
| Branches not to commit on | Protected branches | `PROTECTED_BRANCHES` | `main`, `master` |
| Whether runs end with a version commit | Version commits | (read from the history) | `auto` |
| Where the version lives, how it is set, the message | Version shape | `VERSION_FILE`, `VERSION_FILES`, `VERSION_MESSAGE` | `package.json`, `npm version`, `Version X.Y.Z` |
| Only count version commits by one author | (none) | `VERSION_AUTHOR` | any author |
| A changelog the version commit carries a section in | Changelog | `CHANGELOG` | `auto`: `CHANGELOG.md` at the root or under `docs/` |
| Commands to run before committing | Checks | (lists package.json scripts) | lint, typecheck, check, test, build where defined |
| Paths the skill never stages | Leave alone | `LEAVE_ALONE` | none |
| Prose the skill keeps true | Maintained docs | `DOCS` | `README.md`, `docs/` |
| Names that must not appear in public | Never mention | `NEVER_MENTION` | none |
| Files that should not be tracked | (none) | `JUNK`, `LARGE_FILE` | common build and local files, 1 MB |

`auto` versioning means: a run ends with a version commit when the history already holds a
well-formed one, or when the arguments name a version. A new repository therefore gets plain
itemised commits until the first `/commit 0.0.1`, which starts the convention.

With version commits off, the newest pushed commit stays the baseline: every unpushed commit is
asked about, one made outside a run included, and reviewed unless the answer keeps it; until a
run's commits are pushed the next run asks about them again. That is the trade: nothing is left
unreviewed unless it is pushed without a run or kept at that question, and a forgotten push
costs a question.

What has been exercised, as of 2026-10-20: every path of the scan, against scratch repositories
and against a real history with version commits, and runs of the skill with version commits
off, in this repository. No run has yet produced a version commit. The first project to turn
versioning on exercises that path, and this note should change when it does.

## Growing it into a project's own

Each project skill this one came from added one or more of these. They are the shapes to copy.

- **More in the changelog section.** The built-in section is a prose summary of the release. A
  project that also records something in every section, such as the unit-test count, extends the
  well-formed tests with that line. A project whose changelog is kept in ordinary commits rather
  than version commits sets `CHANGELOG` to null, or every version commit fails the test.
- **A version message of another shape**, such as `Version: X.Y.Z` with a colon. Change
  `VERSION_MESSAGE` along with the Version shape setting. Left at the default, the scan settles
  on whichever older commit happens to match and reviews far too much, or, finding none, on the
  newest pushed commit and reviews only what is unpushed.
- **A version kept in source.** Set `VERSION_FILE` to the source file, the message to its own
  shape such as `Editor: A.B.C`, and the command to an edit of that file. The scan reads
  `NAME = 'x.y.z'` from any text file. The frontmatter already allows an edit, and of the
  commands that set a version it pre-approves only `npm version`, so a project that sets its
  version with another command adds that command to `allowed-tools`, or every run prompts for it.
- **A branch that owns some paths and rebases onto another.** Add an ownership statement, a
  rebase-first step that asks before moving the branch, and a rule that a change to the other
  branch's files is relocated there rather than reviewed here.
- **Files another skill commits.** Put them in Leave alone and `LEAVE_ALONE`. The scan lists what
  changed there and flags any that are staged.
- **A fresh-context review.** Add a step that runs a review skill and reads its verdict line
  before committing.
- **An author gate.** Set `VERSION_AUTHOR` so a version commit by anyone else does not count as a
  baseline, and the scan warns when the git user differs.
- **Release checks.** Add project checks to the scan's Attention list: a feature flag left on, a
  debug switch, a date that has not passed, a cross-file call whose arguments no longer match.
- **A deploy list.** Add a scan section that maps the files changed since the last pushed version
  to what has to be copied where, and a report item that repeats it.
- **Names that must not appear.** Put the words in Never mention and `NEVER_MENTION`; the scan
  searches the added lines and the messages for them, and the skill reads the prose for names
  written another way.

## Keeping a copy current

This repository is the baseline. The frontmatter's `metadata.baseline` is the date of the
baseline a copy was adapted from; Claude Code ignores the field, so it is free to carry that.
What drifts over time is mostly in the frontmatter and the generic body: the `model` and
`effort` values, agent and context fields, the permission-rule syntax in `allowed-tools`, the
skill-directory variable, and the rules and steps themselves. A project's own additions live in
the Project settings block, in the scan's settings block, and in whatever steps it added.

To check a copy against this baseline, run these from this repository. The diffs leave the
settings blocks out, since their values are the copy's own, so the last two lines compare only
the names of the settings: a setting the baseline adds shows up there.

```bash
COPY=/path/to/project/.claude/skills/commit
grep -n 'baseline:' skills/commit/SKILL.md "$COPY/SKILL.md"
diff <(sed -n '2,/^---$/p' skills/commit/SKILL.md) <(sed -n '2,/^---$/p' "$COPY/SKILL.md")
diff <(sed -n '/^## Rules that hold throughout/,$p' skills/commit/SKILL.md) <(sed -n '/^## Rules that hold throughout/,$p' "$COPY/SKILL.md")
diff <(sed -n '/^\/\/ --- Patterns/,$p' skills/commit/scripts/scan.mjs) <(sed -n '/^\/\/ --- Patterns/,$p' "$COPY/scripts/scan.mjs")
diff <(grep -oE '^- \*\*[^*]+:\*\*' skills/commit/SKILL.md) <(grep -oE '^- \*\*[^*]+:\*\*' "$COPY/SKILL.md")
diff <(sed -n '1,/^\/\/ --- Patterns/p' skills/commit/scripts/scan.mjs | grep -oE '^const [A-Z_]+') <(sed -n '1,/^\/\/ --- Patterns/p' "$COPY/scripts/scan.mjs" | grep -oE '^const [A-Z_]+')
```

The first diff is the frontmatter, the second the generic body below the settings, the third
the scan below its settings. Differences that are the project's own additions stay; the rest
is drift to carry over, after which the copy's `metadata.baseline` is set to this file's.
This repository's own copy at `.claude/skills/commit/` is the first project copy. Everything it
adds is a setting's value or one of its own rules, kept in a section above the generic body, so
here the recipe compares none of it and prints only the baseline dates.

## The scan on its own

The scan surveys whichever repository it is run from, so it works without the skill too. It is
read-only and makes a reasonable first check of a branch before a hand-made commit:

```bash
cd /path/to/project && node /path/to/Claude-Skills/skills/commit/scripts/scan.mjs
```

`--since <commit>` names the last commit to keep, so the survey starts after it. It is how the
skill applies the answer to its question about commits above the pushed tip.
