# executioner

An `/executioner` skill for Claude Code. It makes the thread it runs in the manager of an
execution plan written by `/execution-runbook`: it hands each milestone's prompt to a fresh
thread, reviews that thread's result against the plan's acceptance checks when the user says
"Continue", folds the thread's corrections into the plan, says how to proceed, and ends every
message with the effort the next turn needs. It reads everything and writes only the plan file.

It is the generic form of the manager thread that ran one of the two plans this workflow comes
from. That thread wrote its own contract into the plan's §0, and this skill carries the contract
and the practice around it: the file is the state, reviews match evidence to acceptance, effort
switches are dictated by the flow rather than remembered, and the thread never builds.

## Install

Copy the folder into the project and run `/executioner <plan path>` as the first message of a
fresh thread, in plan mode, from the project's directory:

```bash
cp -R skills/executioner /path/to/project/.claude/skills/executioner
```

A copy at `~/.claude/skills/executioner` works in every project. The skill runs by hand only, on
the model and effort the user sets, and its setup message says what they should be: the strongest
model the account has, Fable 5.1 where the user's plan includes it, otherwise Opus 5.5; high for
the setup and from the first handoff, with the few reviews the plan names at xhigh, and xhigh for a
setup that must write §0 or reconcile the plan with the tree. Max is never dictated: Fable at max
is the heaviest setting there is, and the effort is decided from the plan at run time rather than
fixed in the skill. Its `allowed-tools` pre-approve, for the invoking turn, read-only git, edits
under `~/.claude/plans`, and the script below; the later turns run under the thread's
permission mode, which is why plan mode is the fit: it holds the thread to the same limits. The
skill never asks for anything that changes the repository. The script needs Node 18 or later and
nothing else.

Without a path, the skill takes the newest execution plan under `~/.claude/plans`, and asks when
that is unclear.

## How a run goes

1. **Setup**, the first turn. The plan is read whole once; §0 is checked for the contract
   and written in where a plan lacks it; the tree is confirmed against the plan's preamble; the
   model and effort for the thread are stated; a progress table is filled under §0, one row per
   milestone; the message ends `Next turn: high (setup)`.
2. **"Start"** hands M1's prompt over: one line naming the thread to open and its model and effort,
   one fenced block holding the branch tips and versions as git shows them and the prompt copied
   verbatim from the plan, and the closing `Next turn` line. The user pastes the block into a
   fresh thread and lets it run.
3. **"Continue"** reviews the result: the milestone thread's transcript is found by the prompt's
   opening words and its tail is read with `tail.mjs`; the branch is checked with read-only git;
   each acceptance item is matched to a measurement in the report, an unmeasured claim counting as
   unmet whatever the verdict says; the PLAN CORRECTIONS are folded into the plan and named; what
   the release review corrected is carried into the next handoff; then the next prompt goes over,
   or the prompt that continues a milestone the user has acted on.
4. **Anything else** gets an answer, with a prompt to paste where one applies. A decision the other
   thread posed is the user's to make where it is clear; otherwise "Continue" shows it and the
   executioner says what to answer.
5. **The end**: §4 of the plan, the verification of the finished work, goes over as a final prompt
   and is reviewed the same way, and the run is recorded complete.

Every message ends with `Next turn: high` or `Next turn: xhigh`, computed from the flow: xhigh
only where the message has just handed over a prompt whose review runs at xhigh, or asked for a
rewrite. At the start of each turn the thread checks the effort the harness shows against that
line; an xhigh turn at any other setting stops and asks for the change.

## The script

`scripts/tail.mjs` finds and reads another thread's transcript, and changes nothing.
`--find "<text>" --cwd <dir>` lists the project's transcripts whose text holds the words, newest
first, leaving this thread's own out; `<transcript> --last <n>` prints the last assistant
messages, any question they posed, and the model and effort they ran at. Transcripts live under
`~/.claude/projects/<folder>`, the folder being the working directory with every character that
is not a letter or a digit replaced by `-`.

## With the other skills

- `/execution-runbook` writes the plan this skill runs, §0 included. The two skills state the
  same contract; a change to one is a change to the other.
- `/commit` is the release review the plan's Commit lines name. The executioner never runs it: the
  user does, after a milestone's CLEAR, and the next review reads the changelog section it wrote
  for what it corrected.

## Keeping a copy current

This repository is the baseline. The frontmatter's `metadata.baseline` is the date of the
baseline a copy was adapted from. A copy has nothing of its own but the rules a project adds, so
compare the files whole:

```bash
COPY=/path/to/project/.claude/skills/executioner
grep -n 'baseline:' skills/executioner/SKILL.md "$COPY/SKILL.md"
diff skills/executioner/SKILL.md "$COPY/SKILL.md"
diff skills/executioner/scripts/tail.mjs "$COPY/scripts/tail.mjs"
```

Differences that are the project's own additions stay; the rest is drift to carry over, after
which the copy's `metadata.baseline` is set to this file's.
