# commit

A `/commit` skill for Claude Code. It reviews everything since the last reviewed point, fixes
what can still be fixed, commits the working tree as itemised commits with real messages, keeps
the README and docs true, and ends with a version commit where the project keeps them, which
carries the release's section of the changelog. It never pushes: the user reviews the commits and
pushes them.

It is the generic form of four project commit skills, which share one spine and differ in what
each project adds on top. This one keeps the spine and turns the additions into settings, so it
runs as it is in a new repository and grows into a project's own version by editing its two
settings blocks: one at the top of `SKILL.md`, and its twin at the top of the scan.

## Install

Copy the folder into the project and run `/commit` in Claude Code. A copy is the usual install,
since a project adapts the skill by editing its settings.

Run these from the root of this repository, the Claude-Skills clone, not from the project.
`/path/to/project` is the root of the project that gets the skill:

```bash
mkdir -p /path/to/project/.claude/skills
cp -R skills/commit /path/to/project/.claude/skills/commit
```

A project that runs the default settings can link the folder instead, and then runs this
repository's current version with no copy to keep current. The link is kept out of the project's
history. Run these from the root of the Claude-Skills clone too:

```bash
mkdir -p /path/to/project/.claude/skills
ln -sn "$PWD/skills/commit" /path/to/project/.claude/skills/commit
echo .claude/skills/commit >> /path/to/project/.git/info/exclude
```

With `/link-skill`, `/link-skill commit /path/to/project` from the clone, or `/link-skill commit`
from the project, does the same.

A linked skill's settings are this repository's, and an edit made through the link edits them here:
to adapt the skill, turn the link into a copy first, as the repository's
[Install](../../README.md#install) describes. A link or copy at `~/.claude/skills/commit` is not
recommended: it would run in place of every project's own `/commit`, each of which would then need a
name of its own (see [Which one runs](../../README.md#which-one-runs)).

`SKILL.md` names the scan as `${CLAUDE_SKILL_DIR}/scripts/scan.mjs`, and Claude Code substitutes the
skill's own folder for that variable, so the path holds wherever the skill is installed, as a link
or a copy. The skill runs by hand only, at Opus and max effort, and stops unless `/commit` is the
first thing in its thread, so the review starts from a clean context. The scan needs Node 18 or
later and nothing else. The skill's `allowed-tools` pre-approve the commands that change something
in a run, such as staging, committing, rebasing and fast-forwarding, and nothing broader;
read-only git needs no grant. A push, a publish or an `npx` download therefore goes through the
thread's usual permission check.

## What a run does

The review covers everything after the baseline: the last version commit where the project
keeps them, otherwise the newest pushed commit, so that pushing is what closes a run. In that
case the run asks before reading anything committed above the pushed tip, since nothing in the
repository says whether a thread committed it unreviewed or a previous run left it unpushed; the
answer can name the last commit to keep, and the review starts after it. A version commit is the
stronger checkpoint: it lives in the history and travels with every clone, so a forgotten push
costs nothing and a commit made by hand is still reviewed at the next release.

1. **Survey.** Fetches, runs `scripts/scan.mjs`, and stops on anything that needs the user: an
   operation in progress, a detached HEAD, a branch behind its upstream, which it fast-forwards
   on the user's word where that is all the branch needs, a protected branch, a version changed
   by hand, credentials in added lines, files that look like they should not be tracked.
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
   only the version files and the changelog, no trailer. The changelog section tells a user
   what the version offers, and what it holds gives the number, unless the arguments name one.
   It is the next run's baseline.
7. **Report.** Flags first, then each commit, what was left out and why, the checks that ran, and
   the undo point. Nothing is pushed. What is asked for afterwards is development work: after a
   version commit it may be committed above it as ordinary commits, which the next run reviews;
   without one it is left uncommitted, since nothing would tell such a commit from the run's own.

## The changelog and the number

Every version commit carries the release's section of `CHANGELOG.md`. The changelog is release
notes, not a record of the work: it tells someone using the project what a version offers, and
leaves the detail to the commit messages. Its reader may be new to the project and has seen no
earlier version, and what goes in and how it is worded both follow from that.

| The release holds | The section says |
| --- | --- |
| a feature, something new to do or see | a bullet for each |
| a bug fix where a user could clearly have seen the fault | a bullet for each |
| smaller changes a user might still notice | nothing beside a feature; otherwise one bullet naming their kind and no more, such as `Bug fixes` or `User interface improvements` |
| what no user would notice: data, tooling, docs | nothing, unless it is all the release holds: then `Backend improvements` |

A bullet describes the project as the version leaves it, not the change that got it there, since
a comparison with an earlier version means nothing to a reader who never saw it. It names the
thing as the project shows it and says what it is or does in a few words, as a feature list
would. The skill explains this by what a phrase refers to, not by a list of words to avoid.

A changelog started by a run holds that run's section alone:

```markdown
# Changelog

Version Release Notes

## X.Y.Z - YYYY-MM-DD

- One bullet for each note
```

Because the section shows what kind of release it is, it also gives the number:

| The section holds | Level | The number |
| --- | --- | --- |
| no feature | `x.x.#` | the last goes up: `0.4.9` to `0.4.10` |
| a feature | `x.#.x` | the middle goes up, the last returns to 0: `0.4.9` to `0.5.0` |
| a change to the project as a whole, or a milestone | `#.x.x` | the first goes up, the others return to 0: `0.4.9` to `1.0.0` |

A major release, such as `1.0.0` when the project is ready for the general public, is the user's
to call: the run asks before writing one, and its section says what the milestone is. A version
in the arguments, `/commit 1.0.0`, is written as it stands and overrides the level. The run's
report gives the section as written and how it read each change in the release, as a feature, a
fix a user could see, a small change or backend work, so that a misreading is easy to catch.

A project with version commits and no changelog gets one from its next run: the version commit
creates `CHANGELOG.md` at the root with that release's section. The releases before it are not
written up; the changelog starts there and goes forward. From the commit that first holds the
file, a version commit is well-formed only if it touches the changelog and the newest section
there is headed with its number, so a bump made without its section is not taken for a baseline.
Version commits older than the file are judged without it.

The section is written in the version commit and nowhere else. A changelog change the run finds
elsewhere is moved there: one in the working tree is held back from every content commit, and one
in an unpushed commit is taken out of it by a fixup. A section it added becomes notes for the
run's own, and an edit to an older section is kept as it stands. One in a pushed commit cannot be
moved, so the version commit rewrites the section in place.

## With the other skills

A milestone of an execution plan (`/execution-runbook` writes one, `/executioner` runs it, and
`/executioner-guide` changes it while it runs) is one or a few ordinary content commits made by
the milestone's thread; this skill is the release the plan's Commit lines name afterwards. It runs
in a fresh thread, as its rules say, with a version passed only where its own bump would not give
the number, a jump or a line's first version, and the next milestone's review reads its report for
what the review corrected, since the changelog section it wrote says only what a user would see.

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
| The changelog every version commit carries a section in | Changelog | `CHANGELOG` | `auto`: `CHANGELOG.md` at the root or under `docs/`, started at the root where there is none |
| Commands to run before committing | Checks | (lists package.json scripts) | lint, typecheck, check, test, build where defined |
| Paths the skill never stages | Leave alone | `LEAVE_ALONE` | none |
| Prose the skill keeps true | Maintained docs | `DOCS` | `README.md`, `docs/` |
| Names that must not appear in public | Never mention | `NEVER_MENTION` | none |
| Files that should not be tracked | (none) | `JUNK`, `LARGE_FILE` | common build and local files, 1 MB |
| Lengths the survey flags, and how much it shows and scans | (none) | `SUBJECT_MAX`, `STYLE_SAMPLE`, `LONG_RANGE`, `LIST_MAX`, `DIFFS_MAX` | 72 characters, 8 subjects, 40 commits, 40 lines, 300 commits |

`auto` versioning means: a run ends with a version commit when the history already holds a
well-formed one, or when the arguments name a version. A new repository therefore gets plain
itemised commits until the first `/commit 0.0.1`, which starts the convention.

With version commits off, the newest pushed commit stays the baseline: every unpushed commit is
asked about, one made outside a run included, and reviewed unless the answer keeps it; until a
run's commits are pushed the next run asks about them again. That is the trade: nothing is left
unreviewed unless it is pushed without a run or kept at that question, and a forgotten push
costs a question.

What has been exercised, as of 2026-11-20: every path of the scan, against scratch repositories
and against real histories with version commits; the scan's changelog paths against scratch
repositories only, since none of those histories holds a changelog yet; the fixup and the rebase
that take a changelog change out of a commit, by hand in a scratch repository; runs of the skill
with version commits off, in this repository; and runs with version commits on, in a project copy
that has released a line of patch versions, one per milestone of an execution plan. What no run
of the skill has produced yet is a changelog section, a number taken from the release level, or a
changelog change moved into its version commit, and this note should change when one does.

## Growing it into a project's own

Each project skill this one came from added one or more of these. They are the shapes to copy.

- **More in the changelog section.** The built-in section lists features and the bug fixes a
  user could clearly see, and sums the rest up in a line. A project that wants every fix listed,
  or its backend work, rewrites the Changelog rule. One that records something in every section,
  such as the unit-test count, extends the well-formed tests with that line. A project whose
  changelog is kept in ordinary commits rather than version commits sets `CHANGELOG` to null and
  the Changelog setting to `off`, or every version commit fails the test.
- **A bump of another kind.** A project whose releases all take the next last number, or whose
  numbers mean something else, rewrites the Release level rule and the Number step to say so.
  The scan only lists the three numbers a release could take; the choice is the skill's.
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

This repository is the baseline; a project that links the skill runs the baseline itself and needs
none of this. The frontmatter's `metadata.baseline` is the date of the baseline a copy was adapted
from; Claude Code ignores the field, so it is free to carry that.
What drifts over time is mostly in the frontmatter and the generic body: the `model` and
`effort` values, agent and context fields, the permission-rule syntax in `allowed-tools`, the
skill-directory variable, and the rules and steps themselves. A project's own additions live in
the Project settings block, in the scan's settings block, and in whatever steps it added.

To check a copy against this baseline, run these from the root of the Claude-Skills clone, with
`/path/to/project` as the root of the project that holds the copy. The diffs leave the
settings blocks out, since their values are the copy's own, so the last two lines compare only
the names of the settings: a setting the baseline adds shows up there.

```bash
COPY=/path/to/project/.claude/skills/commit
grep -n '^  baseline:' skills/commit/SKILL.md "$COPY/SKILL.md"
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
