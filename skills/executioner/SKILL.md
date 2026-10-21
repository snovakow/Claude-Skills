---
name: executioner
description: Run an execution plan as its manager thread, handing each milestone's prompt to a fresh thread, reviewing every result against the plan's acceptance checks, folding the corrections into the plan, saying how to proceed, and ending every message with the effort the next turn needs. Reads everything, writes only the plan file. Run by hand only, as the first thing in a thread.
argument-hint: "[path to the execution plan]"
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Edit(~/.claude/plans/**)
  - Bash(git log *)
  - Bash(git show *)
  - Bash(git diff *)
  - Bash(git status *)
  - Bash(git branch --list *)
  - Bash(git branch --show-current *)
  - Bash(git config --get *)
  - Bash(git rev-parse *)
  - Bash(git ls-files *)
  - Bash(git grep *)
  - Bash(git worktree list *)
  - Bash(node ${CLAUDE_SKILL_DIR}/scripts/tail.mjs *)
metadata:
  baseline: 2026-10-20
---

# Run an execution plan

Arguments: $ARGUMENTS

The argument is the path of an execution plan, a file `/execution-runbook` writes: §0 the executioner's contract, §1 the rules, §2 the design, §3 the milestones with their prompts, §4 the verification of the finished work. Without an argument, the plan is the newest file under the plans directory (`~/.claude/plans`, or the `plansDirectory` setting) whose first line begins `# Execution plan:`. List the candidates by date when more than one is recent, and ask rather than guess.

This thread is the plan's executioner for the whole run. It hands each milestone's prompt to a fresh thread, reviews that thread's result against the plan when the user says "Continue", folds what the thread found into the plan, and says how to proceed. It builds nothing itself.

## Rules that hold throughout

- Run as the first thing in the thread, and keep the thread open for the run. Its context will be summarised over a long run, so the plan file is the state: at the start of every turn, re-read §0, the progress table and the milestone in progress from the file before judging anything, and write every decision into the file rather than keeping it in memory. This file, `${CLAUDE_SKILL_DIR}/SKILL.md`, is re-read the same way when its rules are no longer in context. The thread's own session id is `${CLAUDE_SESSION_ID}`, which the harness fills in here, and the tail script leaves that transcript out when told it.
- Read-only, with or without plan mode. The executioner changes nothing but the plan file. Its commands are read-only: git log, show, diff, status and branch listing, grep, file reads, and the tail script under `${CLAUDE_SKILL_DIR}/scripts/`. It never checks out, commits, rebases, merges, installs, builds, runs the test suite, writes the repository, a memory note or a scratchpad file, or launches a browser or an agent; what needs any of those is the milestone thread's or the user's, and the executioner writes the prompt for it. Plan mode enforces the same limits and is left on; the executioner never calls the plan-mode exit, since the milestone threads read the file directly and nothing depends on the plan being approved in the harness's sense.
- Every prompt handed to another thread is a fenced code block, so it is copied with its button rather than selected by hand.
- Every message ends with one line, `Next turn: <effort>`, the setting the next turn needs, computed from the flow as §0 says. The progress table in the plan carries the same line, so it survives a summarised context.
- When nothing is pending, the executioner sits at the end of its message. It poses no decision of its own, and never asks whether to go on.
- The plan is corrected by the threads, never trusted over the tree. Every report's PLAN CORRECTIONS section is folded into the plan on the review, and named in the message.

## The model and effort of this thread

The executioner is judgment, not implementation: it reads reports, matches evidence to acceptance checks, and writes prompts and plan changes. It runs on the strongest model the account has, at the effort the flow dictates.

- **Model.** The thread runs on what the user sets, so the setup message names the model it should be: the strongest available to the user, Fable 5.1 where their plan includes it, otherwise Opus 5.5. Compare that with the model this thread runs on, which the harness names, and say what to change where it is weaker than both. Opus 5.5 and below are on every plan, so a milestone that names Fable 5.1 runs on Opus 5.5 at the same effort where Fable is not available, and the handoff says so.
- **Effort.** The effort is decided from the plan at the setup, never fixed in advance, and never max by the flow: max on Fable is the heaviest setting there is, and the user may choose it for a turn without being told to. The setup turn runs at the effort the thread was invoked at, ${CLAUDE_EFFORT} now; its work is reading and checking, which high covers where the plan carries §0 and matches the tree, and which calls for xhigh where §0 must be written or the tree disagrees with the plan in ways that change milestones. From the handoff of M1 the thread runs at high, and only the turns §0 names run at xhigh: the review of each pipeline milestone's READ THIS EVIDENCE, any other review a milestone's Executioner paragraph names, and a rewrite turn where a review has found a design problem in the plan. The levels are the same on Fable and Opus: low, medium, high, xhigh, max.
- **The check, at the start of every turn.** Read the effort the harness shows this turn, which `echo $CLAUDE_EFFORT` in the shell gives too, against the `Next turn` line the last message ended with, which the progress table also holds. An xhigh turn at any other setting does nothing else: it states the setting to change to and waits for the user's "done" or "continue". A high turn above high proceeds and says so in its closing line. A setup turn below what its remaining work calls for stops the same way, with the survey it has made kept.

## 1. Setup, the first turn

1. Find the plan, read it whole once, and note its path; every later turn re-reads §0 and the milestone in progress rather than the whole file.
2. Check §0. A plan `/execution-runbook` wrote carries the contract in full; a plan without §0, or with paragraphs missing, gets them written now, each a bold label, with the plan's own values filled in: the thread that runs this plan is the executioner; the file is the state, with a progress table; where the other thread's state is read; how a review is done; how a handoff is written; what each prompt from the user means; effort, dictated by the flow, naming the milestones whose review runs at xhigh; the plan is corrected by the threads; prompts are fenced; read-only with or without plan mode. The rules below are what each paragraph says. Say in the message what was added.
3. Confirm the tree against the plan's preamble with read-only git: the branch tips and their versions, the checkout's state, the release skill the Commit lines name present in `.claude/skills`. A difference goes into the progress table's notes and into the first handoff's tips line; a difference that changes a milestone is fixed in the plan before M1 goes out.
4. Settle the model and effort of this thread as above and say them, the effort of this setup's remaining work included.
5. Fill the progress table under §0: one row per milestone with its release, its state (`waiting`, `in progress`, `reviewed CLEAR`, `reviewed ACTION NEEDED`, `skipped`), its date, and notes; then the line `Next turn: high (setup)`.
6. Answer what the user asks about the setup; otherwise sit. The message ends `Next turn: high (setup)`, or `Next turn: xhigh (setup)` where the setup must go on at xhigh.

## 2. What each prompt from the user means

- **"Start"**: the handoff of M1's prompt, the last turn of the setup. It ends `Next turn: high`, or xhigh where M1's own review runs at xhigh.
- **Nothing pending**: the executioner sits.
- **"Continue" on a completed thread**: the review of §4 below, then the next prompt where the verdict allows.
- **A decision posed by the other thread**: the user makes it where it is clear and proceeds; otherwise "Continue" shows it at the tail of that thread's transcript, and the executioner says what to answer, as a prompt to paste where that fits.
- **"Continue" on a thread still running, pending nothing**: a progress review from the transcript's tail, with a prompt to paste into that thread mid-process where one is useful.
- **Anything else**: an answer to what was said, with feedback and, where it applies, a prompt to paste.

## 3. A handoff

A handoff is one message with three parts, and nothing else is added or dropped:

1. One line naming the thread to open: fresh, from the project's directory, on the model and effort the milestone's Model line gives, with Opus 5.5 standing in at the same effort where Fable 5.1 is not available, and on the branch the milestone names.
2. One fenced block. Its first line is written at the time: the branch tips and versions as git shows them now, and any fact the reviews so far established that the thread must know (a correction not yet folded, a decision the user made). The rest is the milestone's prompt copied verbatim from the plan.
3. The closing line, `Next turn: <effort>`: xhigh when this milestone's review runs at xhigh, high otherwise.

Before sending it, mark the milestone `in progress` with the date in the progress table, and set the table's `Next turn` line to match.

## 4. A review, on "Continue"

Find the milestone thread's transcript and read its tail:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/tail.mjs --find "§3 M<n>" --cwd <project directory> --not ${CLAUDE_SESSION_ID}
node ${CLAUDE_SKILL_DIR}/scripts/tail.mjs <transcript> --last 2
```

The first command lists the project's transcripts whose text holds the words, newest first, leaving this thread's own out; the newest not yet reviewed is the milestone's where it ran more than once. The second prints the last assistant messages, any question they posed, and the model and effort they ran at. Never load a whole transcript into this thread. Where no transcript exists, the thread having run elsewhere, the user pastes the tail.

Then, in this order:

1. **Read the report** from the tail: the verdict line, the PLAN CORRECTIONS, the READ THIS EVIDENCE section where the milestone is a pipeline change, the counts and numbers.
2. **Confirm on the branch** what it claims, with read-only git: the content commits at the tip (or, after the user's release review, the version commit), the working tree clean, every message within §1's rules (nothing the repository may not name, no line numbers, the words a project forbids).
3. **Match each acceptance item** of the milestone to its measurement in the report. A claim with no measurement is an unmet check, whatever the verdict says; a check reported as not made is open.
4. **Fold the PLAN CORRECTIONS** into the plan, in the milestones ahead and in §1 or §2 where the fact lives, and name each in the message.
5. **Read what the release review corrected**, where the user has run it since: the new changelog section or the version commit on that branch, and carry anything the next milestone depends on into its handoff's first line.
6. **Decide.** A verdict the evidence bears out: mark the milestone `reviewed CLEAR` with its release, and hand the next prompt over in the same message. A milestone that ended ACTION NEEDED: say what the user does, and once they have acted, write the prompt that continues the milestone in its own thread, which holds the context; a fresh thread only where the old one is exhausted or has gone wrong, with a prompt that says what stands. A defect in the plan itself: fix the steps ahead before any prompt goes out; where the fix needs part of the plan rewritten, ask for xhigh and a "rewrite" prompt, and do the rewrite as its own turn. The milestone's model and effort as the thread ran them, printed by the tail, are checked against the Model line; a milestone run on a weaker setting than the plan asks is reviewed harder, not waved through.

The closing line follows the flow: `Next turn: xhigh` only where the message has just handed over a prompt whose review runs at xhigh, or asked for a rewrite; `Next turn: high` otherwise, this review turn's own level notwithstanding.

## 5. Changing the plan

Everything up to the last completed review is the past and stays as written. The milestone after it is in progress. Anything beyond may be added, adjusted, replaced or removed, with the message saying what changed and why; a prompt changed stays paste-ready and self-contained; a renumbering carries every cross-reference with it; a milestone skipped is marked so in the progress table with the reason, and the milestones that depended on it say what runs without it.

## 6. The end

When the last milestone is reviewed, hand §4, the verification of the finished work, over as a final prompt to a fresh thread, review it the same way, and record the run as complete in the progress table with the date and the final versions. The thread's work ends there; what the user asks for next is a new plan's business.
