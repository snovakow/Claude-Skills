# executioner-guide

An `/executioner-guide` skill for Claude Code. It makes the thread it runs in the companion of an
executioner: the thread the user thinks in while `/executioner` runs an execution plan written by
`/execution-runbook`. It answers the user's questions about the plan, the code and the libraries
the work builds on, from the tree and their sources; on the user's word it expands or changes the
plan, writing each addition in the plan's own shape with every cross-reference carried, and tells
the executioner what changed; and where the user asks, it audits the code, a milestone thread's
report or the run so far, reporting without fixing. It changes nothing but the plan file, marks
no milestone's state and restates no step; the milestones' prompts are the executioner's to hand
over, and the guide writes a prompt only where a change cannot wait for the plan's order: a
redirect for the executioner, mid-flow or at its next turn, or the first message of a fresh
thread.

It is the generic form of a thread that stayed open beside the executioner running one of the two
plans this workflow comes from: the thread that had guided the plan's setup. Over that run it
answered design questions from the tree and the installed libraries, audited the code's
architecture when asked, surveyed what else the renderer could draw, and wrote nine milestones
into the plan on the user's word, each with its decision, its seams, its acceptance and its prompt,
renumbering the release each time, while the executioner ran the earlier ones; it told the
executioner what it changed, left the milestone in progress alone, and never touched the tree.
This skill carries that practice.

## Install

Link the folder into the project, or copy it there where the project adds rules of its own, and run
`/executioner-guide` in Claude Code from the project's directory: in the thread that laid out the
source plan or wrote the execution plan, with nothing after the command, or as the first message of
a fresh thread, with the plan's path after it. The executioner skill goes beside it, as a link or a
copy of the same kind, since the guide reads other threads' transcripts with the executioner's
script. A link runs the skill as this repository has it, with no copy to keep current, and is kept
out of the project's history.

Run these from the root of this repository, the Claude-Skills clone, not from the project.
`/path/to/project` is the root of the project that gets the skill:

```bash
mkdir -p /path/to/project/.claude/skills
ln -sn "$PWD/skills/executioner-guide" /path/to/project/.claude/skills/executioner-guide
echo .claude/skills/executioner-guide >> /path/to/project/.git/info/exclude
```

With `/link-skill`, the three lines are one command: `/link-skill executioner-guide
/path/to/project` from the clone, or `/link-skill executioner-guide` from the project; both
skills go in one run as `/link-skill executioner executioner-guide /path/to/project`.

A copy, for a project's own version, also from the root of the Claude-Skills clone:

```bash
mkdir -p /path/to/project/.claude/skills
cp -R skills/executioner-guide /path/to/project/.claude/skills/executioner-guide
```

A link or copy at `~/.claude/skills/executioner-guide` works in every project but is not
recommended: it runs in place of any project's own `executioner-guide`, which would then need a
name of its own; the repository's [Install](../../README.md#install) says when it suits.

## The thread's name

The guide and the executioner reach each other by their threads' names, so each skill names its
thread: the executioner `executioner`, the guide `executioner-guide`. A thread's name is set by the
user, with `/rename <name>` typed in the thread or `claude --name <name>` when it is started, and
the setup message of each skill opens with the `/rename` to type where the thread's name is
anything else. Where two runs share the machine, the listing of threads shows both names with a
ref, and the ref tells them apart. A message the guide cannot deliver goes into its reply as a
fenced block for the user to paste into the executioner thread, and the executioner re-reads the
plan's progress table at the start of every turn, so the file carries a change whether or not the
message arrives. A message between threads in different permission modes is held in the
receiving thread for its user's approval, and one left unapproved expires; the skills put the
executioner in plan mode and the guide in default or auto, so the executioner's user releases
each of the guide's messages, and the guide reports a message as sent, never as read; in the
same mode nothing is held, and a redirect is acted on as it arrives.

## How it runs

The skill runs by hand only, on the model and effort the user sets, and its setup message says what
they should be: the strongest model the account has, Fable 5.1 where the user's plan includes it,
otherwise Opus 5.5, at high; a reply that designs a pipeline milestone or audits a whole tree says
it calls for xhigh and goes on at the thread's setting unless the user changes it. Max is never
dictated. It ends no message with a `Next turn` line and never adds a "Current step" section: the
executioner restates the user's steps, and a step restated here drifts from the one the executioner
holds. Every reply ends with one line on the thread's standing: what is still out and whom it waits
on, or, word for word, that nothing is pending and the thread has wrapped up and waits for the
user's next word. A prompt it writes for a fresh thread goes out as the executioner hands a
milestone's over, the model and effort on the line above the block, as a milestone's Model line
gives them; a prompt for the executioner names none.

Its `allowed-tools` pre-approve, for the invoking turn, read-only git, the listing of and messages
to other threads, and the executioner's script; the later turns run under the thread's permission
mode. The default or auto mode suits it, since its backups, edit scripts and trials run in the
scratchpad directory the harness names; plan mode holds it to reads and the plan file, which suits
a thread that only answers questions. The plan's folder, `~/.claude/plans`, is a protected one that
no rule pre-approves a write in: an edit there is judged by auto mode's classifier and asked about
otherwise. The skill never asks for anything that changes the repository: a milestone thread or a
`/commit` thread may be working in the tree at any moment, and the tree is theirs.

Without a path, the skill guides the execution plan the thread holds: the one `/execution-runbook`
wrote in it, or the one written from the source plan the thread laid out. A thread that holds
neither is asked for the path, with the execution plans under `~/.claude/plans` listed newest
first. The thread that laid out the plan is the best guide, since it holds the design's reasons; a
fresh one reads them from the plan.

## What a turn does

1. **Setup**, the first turn. The plan is read whole once; the thread's name is read and the
   `/rename` given where it differs; the tree's tip is confirmed against the plan's progress table
   with read-only git; the message says what the thread does and does not do, then answers what
   was asked or sits.
2. **A question** gets an assessment from the tree and the sources, with the files and functions
   named, and no change: a change waits for the user's word.
3. **"Add to the plan"**, a change or a brief: the state is re-read from the file; the change is
   designed on readings of the tree and the libraries' sources, with trials in the scratchpad
   where a claim can be tried; every open choice is settled and named as the thread's, for the user
   to overturn; the change is written in the plan's own shape, a dated decision, the design
   paragraph, the milestone with its seams, acceptance, model, fenced prompt, commit and
   executioner line, and the additions to the verification, the left-out list and the risks; the
   release milestone and every cross-reference are renumbered; the file is checked by grep, with
   the milestone in progress diffed against a backup to show only the forced cross-reference; the
   tree is confirmed untouched; the executioner is told.
4. **An audit**, where asked: the code's architecture, a milestone thread's report read from its
   transcript's tail with the executioner's script, or the run so far against the tree; findings
   with their evidence, fixes none, the verdict the executioner's.
5. **A prompt**, where the plan's order would carry a change out too late or the user asks for
   one: a redirect sent to the executioner by message mid-flow, which reaches it even while it
   works; or a fenced block in the reply for the user to paste, into the executioner thread as
   its next move or into a fresh thread as its first message, for a trial or a milestone run out
   of order, a fix becoming a milestone first, with the executioner told; never the next
   milestone handed over in the executioner's place.
6. **A message from another thread**, or the user's `answer executioner's message`: answered by
   message, recommending what the user has agreed to or would, and reported in the reply.
7. **The end**: when the plan's progress table records the plan closed, the guide's work is done,
   and the executioner's closing message closes this window with its own.

## With the other skills

- `/executioner` runs the plan this thread guides. The two threads reach each other by name; the
  executioner reads the guide's changes from the file at its next turn and names them in its
  message, and judges every milestone, the guide's additions included, by the plan's acceptance
  checks. A redirect the guide sends the executioner by message, or writes for the user to paste
  at its next turn, opens `From executioner-guide:` and is read there as the user's word,
  released by their approval where the harness holds it; a fresh thread the guide prompts
  reports in the plan's shape, and the executioner holds its next handover until that report.
  The guide reads other threads' transcripts with the executioner's `tail.mjs`.
- `/execution-runbook` writes the plan in the shape the guide's additions follow: a milestone the
  guide adds carries every paragraph the runbook gives one, and the plan's §0 names the guide
  thread.
- `/commit` releases each milestone. The guide never runs it and never edits the tree while it
  runs.

## Keeping a copy current

This repository is the baseline; a project that links the skill runs the baseline itself and needs
none of this. The frontmatter's `metadata.baseline` is the date of the baseline a copy was adapted
from. A copy has nothing of its own but the rules a project adds, so compare the file whole, from
the root of the Claude-Skills clone, with `/path/to/project` as the root of the project that holds
the copy:

```bash
COPY=/path/to/project/.claude/skills/executioner-guide
grep -n '^  baseline:' skills/executioner-guide/SKILL.md "$COPY/SKILL.md"
diff skills/executioner-guide/SKILL.md "$COPY/SKILL.md"
```

Differences that are the project's own additions stay; the rest is drift to carry over, after
which the copy's `metadata.baseline` is set to this file's.
