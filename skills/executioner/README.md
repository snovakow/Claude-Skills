# executioner

An `/executioner` skill for Claude Code. It makes the thread it runs in the manager of an
execution plan written by `/execution-runbook`: it hands each milestone's prompt to a fresh
thread, reviews that thread's result against the plan's acceptance checks when the thread reports
by message or the user says "Done", folds the thread's corrections into the plan, hands over what
follows one step at a time, the release before the next prompt, and ends every message with the
effort the next turn needs. The milestone threads send their questions here by message too, and
it answers them from the plan, bringing the user only what is theirs to decide. It reads everything
and writes only the plan file. A companion thread, `/executioner-guide`, may stand beside it for
the user's questions and for changes to the plan, which it reads from the file at its next turn,
and, where a change cannot wait for the plan's order, for a redirect sent here by message or pasted
here at the next turn, or a fresh thread started on the guide's word.

It is the generic form of the manager thread that ran one of the two plans this workflow comes
from. That thread wrote its own contract into the plan's §0, and this skill carries the contract
and the practice around it: the file is the state, reviews match evidence to acceptance, effort
switches are dictated by the flow rather than remembered, and the thread never builds.

## Install

Link the folder into the project, or copy it there where the project adds rules of its own, and run
`/executioner` in Claude Code, in plan mode, from the project's directory: in the thread that wrote
the execution plan, with nothing after the command, or as the first message of a fresh thread, with
the plan's path after it. A link runs the skill as this repository has it, with no copy to keep
current, and is kept out of the project's history.

Run these from the root of this repository, the Claude-Skills clone, not from the project.
`/path/to/project` is the root of the project that gets the skill:

```bash
mkdir -p /path/to/project/.claude/skills
ln -sn "$PWD/skills/executioner" /path/to/project/.claude/skills/executioner
echo .claude/skills/executioner >> /path/to/project/.git/info/exclude
```

With `/link-skill`, the three lines are one command: `/link-skill executioner /path/to/project`
from the clone, or `/link-skill executioner` from the project.

A copy, for a project's own version, also from the root of the Claude-Skills clone:

```bash
mkdir -p /path/to/project/.claude/skills
cp -R skills/executioner /path/to/project/.claude/skills/executioner
```

A link or copy at `~/.claude/skills/executioner` works in every project but is not recommended: it
runs in place of any project's own `executioner`, which would then need a name of its own; the
repository's [Install](../../README.md#install) says when it suits.

The skill runs by hand only, on the model and effort the user sets, and its setup message says what
they should be: the strongest model the account has, Fable 5.1 where the user's plan includes it,
otherwise Opus 5.5; high for the setup and from the first handoff, with the few reviews the plan
names at xhigh, and xhigh for a setup that must write §0 or reconcile the plan with the tree. Max is
never dictated: Fable at max is the heaviest setting there is, and the effort is decided from the
plan at run time rather than fixed in the skill. Its `allowed-tools` pre-approve, for the invoking
turn, read-only git, the script below, and the listing of and messages to other threads; the
later turns run under the thread's permission mode, which is why plan mode is the fit: it holds
the thread to the same limits. The plan's folder, `~/.claude/plans`, is a protected one that no
rule pre-approves a write in: the thread's own plan file needs none, and any other plan there,
whichever thread wrote it, is judged by auto mode's classifier, in plan mode too where auto mode
is available, and asked about otherwise. The skill never asks for anything that changes the
repository. The script needs Node 18 or later and nothing else.

Without a path, the skill runs the execution plan the thread wrote, whether or not the thread also
made the source plan that one was written from, so one thread can lay out a plan, turn it into an
execution plan with `/execution-runbook`, and run it. A source plan with no execution plan written
from it, held by the thread or given by its path, is not run: the skill says to run
`/execution-runbook` on it first. A thread that holds neither is asked for the path, with the
execution plans under `~/.claude/plans` listed newest first. A thread that holds other work besides
the plan's making, or was continued from a summary, is told to run the executioner fresh with the
path: the plan file is the state, so the run loses nothing by moving.

## The thread's name

The thread is named `executioner`: the setup message opens with `/rename executioner` to type
where the thread's name is anything else, since the milestone threads and the guide thread,
`/executioner-guide`, reach this one by that name, and the guide is reached as `executioner-guide`;
`claude --name executioner` names a fresh thread as it starts. Where two runs share the machine,
the listing of threads shows both names with a ref, and the ref tells them apart. A change the
guide thread makes to the plan is read from the file at the next turn, which re-reads the progress
table before anything else, and named in the message as this thread's own changes are. A message
between threads in different permission modes is held in the receiving thread for the user's
approval, here as in the milestone threads and the guide, so with this thread in plan mode and
the others in default or auto the user releases each message, and one left unapproved expires;
in the same mode nothing is held, and a message is acted on as it arrives.

## How a run goes

1. **Setup**, the first turn. The plan is read whole once; the thread's name is read and the
   `/rename executioner` to type is given where it differs; §0 is checked for the contract and
   written in where a plan lacks it; the tree is confirmed against the plan's preamble; the model
   and effort for the thread are stated; a progress table is filled under §0, one row per
   milestone; the message ends `Next turn: high (setup)`.
2. **"Start"** hands M1's prompt over: one line saying to paste the block as the first message of a
   fresh thread and naming its model and effort, one fenced block written for that thread alone,
   holding the branch tips and versions as git shows them and the prompt copied verbatim from the
   plan, and the closing `Next turn` line. The user pastes the block into a fresh thread and lets
   it run. The prompt ends by having the thread send its verdict here by message once its report
   is written, and any decision that is not its own on the way, instead of asking the user.
3. **The thread's closing message**, or the user's **"Done"** where none arrives, starts the
   review, which reads the report from the transcript and never from the message: the milestone
   thread's transcript is the one the script lists with the prompt's words in its first typed
   message, and its tail is read with `tail.mjs`; the branch is checked with read-only git; each
   acceptance item is matched to a measurement in the report, an unmeasured claim counting as
   unmet whatever the verdict says; the PLAN CORRECTIONS are folded into the plan and named; what
   the last release corrected is carried into the next handoff, its report read from the tail for
   a plan fact it found wrong, a problem it reported and left, and a decision the user answered
   that a later milestone relies on; then the next step goes over alone, a fresh thread of its
   own: a commit the release waits for, then the release (a prompt names its model and effort, a
   release names none where the skill's frontmatter sets its own), then, on the "Done" that
   confirms it, the next milestone's prompt. Steps go together only where they can run at once,
   and the message says so; the table's `Pending` line names the step out. The review ends with
   a closing message to the thread: on CLEAR, that it is finished and its window is safe to
   close, which the thread answers in one line; on ACTION NEEDED, once the user has acted, the
   prompt that continues the milestone in that thread, sent there rather than pasted.
4. **A question from a milestone thread**, sent here by message as its prompt asks, is answered by
   message from the plan where the plan decides it; a decision that is the user's is posed to them
   here first, with a recommendation, and the answer sent on once given. **Anything else** gets an
   answer, with a prompt to paste where one applies. A decision a thread posed to the user instead
   is the user's to make where it is clear; otherwise "Continue" shows it and the executioner says
   what to answer, or the user has that thread message this one with
   `answer executioner's message`, and the answer goes back by message.
5. **The end**: §4 of the plan, the verification of the finished work, goes over as a final prompt
   and is reviewed the same way, and the run is recorded complete.

Every message ends with `Next turn: high` or `Next turn: xhigh`, computed from the flow: xhigh
only where the message has just handed over a prompt whose review runs at xhigh, or asked for a
rewrite. At the start of each turn the thread checks the effort the harness shows against that
line; an xhigh turn at any other setting stops and asks for the change.

The line before `Next turn` names the windows. The user keeps one open for every thread of the
run, and each message says which may close and which stay, by the names their tabs show, each
with what it waits on, so that the open tabs show where the run is. A milestone thread's window
closes when a CLEAR review tells the thread it is finished, a release's or a change's when its
"Done" is confirmed; this thread's and the guide's stay for the run, and a window just opened
goes by its step's name until the harness titles it. A window not named closed is still live,
and a "Done" for one already closed, or with nothing out, gets the windows line again and
nothing else.

## The script

`scripts/tail.mjs` finds and reads another thread's transcript, and changes nothing.
`--find "<text>" --cwd <dir>` lists the project's transcripts in which a message a person typed
holds the words, newest first, leaving this thread's own out, each with the name its tab shows,
and marks the ones where that is the thread's first message, as a milestone thread's prompt is,
a command run directly in the thread before it, such as `/rename`, not counting; a transcript
that only quotes the words in its replies, such as this thread's handoffs, is not listed, and
with `--exact` a typed message counts only where it is the text alone, as a forked command the
user typed is. `<transcript> --last <n>` prints the last replies, which are the assistant's
messages with any question they posed and the output of any command run directly in the thread,
such as a forked skill the user typed, then the model and effort the assistant ran at and the
name the tab shows. Transcripts live under `~/.claude/projects/<folder>`, the folder being the
working directory with every character that is not a letter or a digit replaced by `-`.

## With the other skills

- `/execution-runbook` writes the plan this skill runs, §0 included. The two skills state the
  same contract; a change to one is a change to the other.
- `/executioner-guide` is the companion thread: the user's questions about the plan and the code
  go there, and so do additions and changes to the plan, which that thread writes into the file
  in the plan's own shape and reports here by message; this thread reads them from the file at
  its next turn and judges the milestones it added like any other. Where a change cannot wait for
  the plan's order, the guide sends a redirect here by message, or writes one for the user to
  paste at the next turn, opening `From executioner-guide:` and read as the user's word once
  their approval releases it, or the first message of a fresh thread, a trial or a milestone run
  out of order, whose report this thread reviews where it is a milestone's while holding its next
  handover. The two reach each other by their threads' names, `executioner` and
  `executioner-guide`.
- `/commit` is the release review the plan's Commit lines name. The executioner never runs it: the
  user does, after a milestone's CLEAR, in a fresh thread, on the model and effort its own
  frontmatter sets where it declares them, which no release step need name, and the next turn
  reads the changelog section it wrote and its report's tail for what it corrected, what it
  reported and left, and what the user decided in it.

## Keeping a copy current

This repository is the baseline; a project that links the skill runs the baseline itself and needs
none of this. The frontmatter's `metadata.baseline` is the date of the baseline a copy was adapted
from. A copy has nothing of its own but the rules a project adds, so compare the files whole, from
the root of the Claude-Skills clone, with `/path/to/project` as the root of the project that holds
the copy:

```bash
COPY=/path/to/project/.claude/skills/executioner
grep -n '^  baseline:' skills/executioner/SKILL.md "$COPY/SKILL.md"
diff skills/executioner/SKILL.md "$COPY/SKILL.md"
diff skills/executioner/scripts/tail.mjs "$COPY/scripts/tail.mjs"
```

Differences that are the project's own additions stay; the rest is drift to carry over, after
which the copy's `metadata.baseline` is set to this file's.
