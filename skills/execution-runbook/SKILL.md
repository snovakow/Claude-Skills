---
name: execution-runbook
description: Turn a brief into an execution plan for a project, milestone by milestone, each with its seams, acceptance checks, model and effort, a paste-ready prompt and its commit, under the rules every thread works by and the executioner's own section. Writes one markdown file, names it, and shows it. Changes nothing in the repository. Run by hand only.
argument-hint: "[x.y.z] <the brief: what is to be built>"
disable-model-invocation: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Agent(Explore)
  - Agent(Plan)
  - AskUserQuestion
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
  - Bash(code -r *)
  - Bash(open -a "Visual Studio Code" *)
metadata:
  baseline: 2026-10-21
---

# Write an execution plan

Arguments: $ARGUMENTS

The arguments are an optional version, written like `7.1.0`, and the brief: what is to be built, typed or pasted, as long as it needs to be. The version is the number the plan's first release carries, where the project keeps version commits. With no brief, ask for one and stop.

The plan is a markdown file that other threads execute one milestone at a time, each in a fresh thread with the milestone's prompt as its first message, while a manager thread, the executioner, hands the prompts over and reviews the results against the plan. This skill writes the plan; `/executioner` runs it. Everything a milestone thread needs is in the file: the rules, the design, its own section and its prompt. Nothing travels by memory.

## Rules that hold throughout

- Run it in a fresh thread, in plan mode, with the brief as its first message. A thread that already holds the discussion that led to the brief may run it too; what was decided there goes into the plan as dated decisions.
- Change nothing in the repository: no checkout, no commit, no install, no build, no edit to a tracked file. Read-only git, file reads, searches and subagents that search are the tools. The one thing written is the plan file. The test suite may be run once for its count where the project does not record it, and only when running it writes nothing into the tree.
- Treat every fact as a reading of the tree at a named commit, dated. The plan says so, and the threads verify what they rely on.
- The plan names the person by the first name `git config user.name` gives, or "the user": a prompt is read by a thread, so "you" in one means the thread.
- Keep the plan outside the repository, under the plans directory (`~/.claude/plans`, or the `plansDirectory` setting), so no thread can commit it and every thread can read it.

## Where the plan goes

- In plan mode, the plan file is the one the harness names for the thread. Write there.
- Otherwise, write to `<plans directory>/<repository folder name>-<topic>/execution-plan.md`, the topic a few kebab-case words for what is built.

Every prompt in the plan opens with "Read `<that path>` §1 …", so settle the path before writing a prompt.

## 1. Survey

Before any subagent runs, take the facts that frame everything, each from the tree or git, never from memory:

- the branches the work lands on, their tips and versions, whether the checkout is clean, and what `main` points at
- the release skill, if one is installed: `.claude/skills/commit/SKILL.md` and any sibling such as `commit-editor`, in the project or under `~/.claude/skills`. Read its settings block: the protected branches, the version shape and whether runs end with a version commit, the checks it runs, the docs it maintains, the names it never mentions, and whether it must be run in a fresh thread. These become rules of §1 and the Commit lines of §3.
- the project's own instructions: `CLAUDE.md`, the docs folder, and the memory notes in the project's memory index that bear on the brief. Rules that bind the work are restated in the plan, each once, so that no thread needs anything but the plan and the repository.
- the test runner, the current test count where the project records it (a changelog section, a release note; otherwise one run of the suite), and the build command with its cautions
- the size of what is replaced or extended: line counts of the modules involved, where they are imported, the one thing that uses them today
- the precedent: the commit that last added something of the same shape (a new kind, a new pass, a new window), by hash and file count, since its touched files are the seam list a milestone copies

Keep each fact with its source: the commit, the file, the function.

## 2. Size the job

This thread runs at ${CLAUDE_EFFORT}. The plan's judgments are what the whole execution runs on, so the thread runs on the strongest model the account has, Fable 5.1 where the user's plan includes it, otherwise Opus 5.5, and at the effort the brief's size calls for, decided now from the survey rather than fixed in advance:

- **high**: one area of the code on one branch, a few milestones, no pipeline change.
- **xhigh**: several areas or two branches, a pipeline change, a removal across many files, or about eight milestones or more.
- **max** is never called for: the stress-test of step 8 runs at xhigh in its own context whatever this thread runs at, and max on Fable is the heaviest setting there is. The user may still choose it.

Say the size and the setting it calls for in the first message, beside the setting the thread has. Where the thread runs below it, stop there: say what to set, and that "continue" resumes from step 3 with the survey kept. Where it runs above it, proceed and say so.

## 3. Explore

Launch one Explore subagent per area the brief touches, in parallel, breadth "very thorough", each briefed with the repository's layout and asked for the seams by name: the files and functions a change goes through, the precedent's touched files, the tests beside them, the conventions a module follows, and what the brief's words map to in the code. Gather the cheap facts yourself while they run. Where a design choice is risky, have a Plan subagent check it against the code before it is written in. Trust nothing from a brief or a note over the tree: a claim that matters is read in the source.

## 4. Decide

Collect every choice the brief leaves open that would change the plan: a mode kept or dropped, a port versus an in-place change, a layout model, which first version number a release line starts at when the arguments name none and the project keeps version commits. Ask them all in one AskUserQuestion, the recommended answer first with its trade-off, before writing. The answers go into §1 as dated decisions every milestone follows.

## 5. The shape of the plan

Write it in this order. Headings are the sections; bold run-in labels are the paragraphs. The two plans this shape was taken from ran fourteen and fifteen milestones; a smaller brief makes fewer.

**Title and preamble.** `# Execution plan: <the thing>`, then one paragraph: what it is in a sentence, the date and the tip it was read from, the decisions folded in, and "Milestones M1–M<n> run one per fresh thread in file order".

**§0. The executioner thread.** The contract of the thread that runs the plan, written so that the thread can re-read it from the file after its own context has been summarised. Its paragraphs, each a bold label:

- *The thread that runs this plan is the executioner.* It hands each milestone's prompt to a fresh thread, reviews that thread's result on the user's "Continue", says how to proceed, and may change this file: everything up to the last completed review is the past and stays as written; the step after the last completed review is in progress; anything beyond it may be added, adjusted, replaced or removed, and the executioner says in its message what it changed.
- *The file is the state.* At the start of every turn the executioner re-reads §0, the progress table and the milestone in progress before judging anything, and writes what it decides into the file. A progress table follows this paragraph: one row per milestone with its release, its state (waiting, in progress, reviewed CLEAR, reviewed ACTION NEEDED, skipped) and the date, and a last line `Next turn: <effort>`.
- *Where the other thread's state is read.* The milestone thread's transcript is the `.jsonl` under the project's folder in `~/.claude/projects/` whose text holds the milestone prompt's opening words, never the executioner's own, the newest where a milestone ran more than once; its tail is read with the executioner skill's `tail.mjs`, never by loading the whole file. Where no transcript exists, the user pastes the tail.
- *How a review is done*, in order: read the report from the tail; confirm on the branch what it claims with read-only git (the content commits at the tip, the tree clean, every message within the rules); take each acceptance item of the milestone and find its measurement in the report, a claim with no measurement being an unmet check whatever the verdict says; fold the report's PLAN CORRECTIONS into this file and name them; where the user has run the release review since, read the new changelog section for what it corrected and carry what the next milestone depends on into its handoff; then decide. A verdict the evidence bears out hands the next prompt over; a milestone that ended ACTION NEEDED continues in its own thread with a prompt the executioner writes once the user has acted, and a fresh thread is started only where the old one is exhausted or has gone wrong; a defect in the plan is fixed in the steps ahead before any prompt goes out.
- *How a handoff is written.* The next milestone's prompt is copied from this file verbatim into a fenced block, preceded inside the block by one line the executioner writes at the time: the branch tips and versions as git shows them, and any fact the reviews so far established that the thread must know. Above the block, one line names the model and effort the thread runs at, from the milestone's Model line, with Opus 5.5 standing in at the same effort where Fable 5.1 is not available. Nothing else is added or dropped.
- *What each prompt from the user means.* "Start": the handoff of M1's prompt, the last turn of the setup. Nothing pending: the executioner sits and poses no decision of its own. "Continue" on a completed thread: the review above, then the next prompt where the verdict allows. A decision posed by the other thread: the user makes it where it is clear; otherwise "Continue" shows it at the tail and the executioner says what to answer. "Continue" on a thread still running: a progress review, with a prompt to paste into that thread mid-process where one is useful. Anything else: an answer to what was said, with a prompt to paste where it applies.
- *Effort, dictated by the flow.* The setup, every turn before M1's prompt is handed over, runs at high, or at xhigh where this file lacked §0 or the tree disagreed with it, and those messages end `Next turn: high (setup)` or `Next turn: xhigh (setup)`; max is never dictated. From the handoff of M1 the executioner runs at high, and exactly the turns this file names run at xhigh: the review of each pipeline milestone's READ THIS EVIDENCE, and any other review the milestones' Executioner paragraphs name. One more is conditional: where a review finds a design problem that needs part of this plan rewritten, the review turn asks for xhigh and a "rewrite" prompt, and the rewrite is its own turn. Every message of the executioner ends with one line, `Next turn: high` or `Next turn: xhigh`, computed from the flow: xhigh only where the message has just handed over a prompt whose review runs at xhigh, or asked for a rewrite; high otherwise, the review turns included, since the message that reviews one milestone also hands over the next. At the start of every turn the executioner reads the effort the harness shows it against that line: an xhigh turn at any other setting does nothing else, states the setting to change to, and waits for the user's "done" or "continue"; a high turn above high proceeds and says so in its closing line.
- *The plan is corrected by the threads, never trusted over the tree.* Each report carries a PLAN CORRECTIONS section; the executioner folds every correction in on the review, so the next thread reads facts the tree bears out.
- *Prompts.* Every prompt handed to another thread, in this file or in a message, is a fenced code block, so it is copied with its button rather than selected by hand.
- *Read-only, with or without plan mode.* The executioner changes nothing but this file. Its commands are read-only: git log, show, diff, status and branch listing, grep, file reads, and its skill's tail script; it never checks out, commits, rebases, merges, installs, builds, runs the test suite, writes the repository, a memory note or a scratchpad file, or launches a browser or an agent; what needs any of those is the milestone thread's or the user's, and the executioner writes the prompt for it. Plan mode enforces the same limits and is left on; the executioner never calls the plan-mode exit. Where plan mode is off, this paragraph stands on its own.

**§1. Context.**

- *What is being built.* The thing in a paragraph: what goes, what comes, what it reaches, in the project's own terms.
- *Decisions*, dated and attributed, which every milestone follows: the answers from step 4 and anything the brief itself settled.
- *Inspiration, not source*, where the brief names references: what they are the reference for and what is never copied from them, and the idiom everything is written in.
- *Rules that bind every milestone*, from the project's own instructions, each restated once: where work lands (branches, the worktree rule when the checkout is busy, how one branch rebases onto another); the release rule (a milestone is one or a few ordinary content commits on its branch; the release skill, run by the user, writes the version and the changelog section; the version scheme; what a commit message must carry for the changelog); what must never appear in the repository; comment and doc conventions; the compatibility rule (what an older document or input is owed, and what a fix reaching every launch must say); what must never be edited (another repository, existing test data); the test command and the count at the tip, the build command and its cautions, module boundaries; the domain's invariants (the rules a wrong change breaks silently); and this one, verbatim in spirit: **the plan binds on decisions and acceptance, not on its code facts**: every seam, name and behaviour claim is a reading of the tree at the named tip, made before the milestones ahead moved it; a thread verifies each claim it relies on against the tree it works in, follows the tree where the two differ, and reports every difference; an acceptance check is a measurement the thread makes, never the plan's expectation restated, and a check the thread cannot make is reported as not made.
- *How every milestone thread ends.* The last line of the report is one of two verdicts, on its own line: `CLEAR: commit made on <branch>; run /commit (or the project's release skill, with the version written in where the milestone is a line's first release), then start M<n+1>.`, used only when every acceptance check passed, the checks are green and the live evidence shows no unexplained difference; or `ACTION NEEDED: <what the user must do or decide, in one or two sentences>.`, used when a check failed, a difference is unexplained, a device check is required before the commit is safe, or a decision in the milestone is the user's. The thread does not commit on an ACTION NEEDED unless the commit is complete and only the outside check remains, and says which. Anything short of a passed check is ACTION NEEDED, never CLEAR with a caveat. The report ends in a fixed order: a section headed PLAN CORRECTIONS (each place the plan's facts differed from the tree: the file, the function or constant, what the plan said, what is true; or the word "none"), then, for the pipeline milestones alone, a section headed READ THIS EVIDENCE naming the pairs and numbers the user reads personally, then the verdict line.
- *The live harness.* How a thread proves a change live in this project: how the thing is served and driven, from which tree, on which ports and never through the user's own; what counts as evidence (a screenshot's pixel or mean colour, a value sampled per frame, a ratio against the same harness on the same frames); how a before/after pair is made (a worktree at the old tip beside the new one); what cannot be driven from the harness and is the user's to check on a device.

**§2. The design in one place.** What every milestone builds toward: the document or data shape, the behaviour, the rendering or runtime path, the interaction, the scripting surface, the editor's side, the demos, each a paragraph a milestone can point at for the part it lands.

**§3. Milestones.** Open with: numbered and listed in execution order, M1 through M<n>, each run after the one above it is committed and released; the order's logic in a sentence; what each gives; "Fresh thread" means a new thread with the prompt as its first message. Then each milestone:

- Heading: `### M<n>. <what it lands> — <branch>` with ` — pipeline change (<why>)` where it is one, `(no project code; <the other repository>)` where it lands none, `(stretch)` or `(optional)` where it is.
- **Seams.** (or **Design.**, **Fields.**, **Where.**, as the milestone needs): the files and functions by name, the precedent's touched files, what is settled from a dependency's source and recorded in a module header, what is left out and why.
- **Reuse.** The existing functions and modules the milestone builds on.
- **Acceptance.** Unit: the tests by file, what each proves. Live: the named projects and pairs, each with its measurement, and the one difference the milestone must show. The changelog line the commit carries, with the compatibility word the project's rule asks for.
- **Model.** `<Model> <version>, <effort>, fresh thread (<why this level>)`. The levels, from the two plans: Sonnet 5.5 at medium for a pure rule with a call site or two, a registration, a script and a folder copy; Opus 5.5 at medium for a local change with a subtlety or two; Opus 5.5 at high for many lists or rows where a missed one silently breaks something, an editor's seams, a port; Fable 5.1 at high for a new kind through every seam, a new surface that must agree with another to the pixel, authoring across everything the plan built; xhigh, on Fable 5.1 or Opus 5.5, for a pipeline change: anything that sits ahead of every frame or every input, changes a lifecycle that recompiles or re-arms everything, or takes a global property away. State the reason on each, and say why high is enough where a pipeline change gets less. Name Fable 5.1 where the strongest model is needed; §0's handoff rule substitutes Opus 5.5 at the same effort where Fable is not available.
- **Prompt.** A fenced block, paste-ready and self-contained: `Read <plan path> §1 (rules, harness), §2 and §3 M<n>, then <the files to read first>.` then on which branch and under which worktree rule, what to build as M<n> specifies in a sentence or two that names the parts, the constraints that matter most (what not to touch, what the header or the commit must say), `Tests as M<n> lists.`, the live checks as M<n> lists with the projects named, the checks and the commit with its count, what to report (counts, numbers, what could not be done), and the closing line: for a pipeline milestone, `This is a pipeline milestone, so before the verdict put a section headed READ THIS EVIDENCE: three to five bullets naming the before/after pairs and numbers <name> should look at, each with the file path of its screenshots or sampled values, the project it came from, and what a wrong result would look like there.`; then always `End as §1 defines: a PLAN CORRECTIONS section, then the closing verdict line (CLEAR or ACTION NEEDED).` A milestone that ends ACTION NEEDED by design says so in its prompt and names the things that are the user's.
- **Commit.** The branch, how many content commits and which, and the release the user runs afterwards: the release skill by name, in the thread its rules ask for, with the version written in only where the milestone is a line's first release; `None` with the reason where the milestone commits nothing (another repository, no project code); the rebase or the user's action the release depends on.
- **Executioner.** Only under the milestones whose review runs at xhigh: "The message that hands over this prompt ends `Next turn: xhigh`; the review of this milestone runs at xhigh and ends `Next turn: high`" (or xhigh again where the next review is one too). Which reviews those are is the plan's judgment: every pipeline milestone's, and any milestone whose report judges many things at once, such as a demo of many scripted effects.

Order the milestones so that each stands on what is released before it: pipeline changes first, each proven to leave the existing projects identical; then additions in dependency order; a port before the removal it frees; an editor half after the player half it needs is released and rebased onto; assets and demo folders where nothing earlier needs them and where a new folder's effect on the test count is stated; demos and authoring last; stretch and optional work at the end with what runs without it. Number them in that order, top to bottom: the reader runs them by reading down the file.

**§4. Verification of the finished work.** Numbered: load, the walk through every behaviour on the harness with its read-backs, the user's device checks, performance as ratios, and a regression pass against the starting tip naming the projects that must be identical.

**§5. Considered and left out.** One list, each item with its reason in a clause.

**§6. Open risks.** What the stress test (step 8) left open, each numbered with what would settle it. Omit the section when there is none.

## 6. Versions and the release skill

Where the project keeps version commits, the release skill's argument hint says how a version is passed. The plan's rule: the user enters a version once per release line, the first release of the line being `/<skill> <version>` with the version from the arguments, or the next number from the tip when none was given and the user confirmed it in step 4; every later release is a plain `/<skill>`, which bumps from what was entered, so numbers run in release order. A second line (an editor branch, a second package) gets its first number from the user at its first release. Say in §1 which milestones release nothing. Where no release skill is installed, the Commit lines say how the project releases, or "commit on <branch>" alone.

## 7. Write and check

Write the file in sections, each with a marker for the next (`<!-- §3 follows -->`), so a cut in the output costs nothing; replace the markers as the sections land. Then check with grep, and fix what fails:

- no marker is left; the heading list reads §0 to §5 (§6 where it exists) with the milestones in order
- every milestone has Model, Prompt and Commit; the fence count is twice the prompt count; every prompt names the plan's path and its own section
- the version strings and release commands agree with §1's scheme; no milestone's number is a leftover label
- no reference to a section, milestone or file that no longer exists after a renumbering
- every rule the prompts rely on is in §1; nothing points a thread anywhere but the plan and the repository, bar the project's own memory notes by title

## 8. Stress-test

A reviewer that did not write the plan catches more, so hand the finished plan to a Plan subagent at effort xhigh with a fresh context, briefed to review it against the tree at the named tip: that every seam and function it names exists and works as claimed; that each milestone's change works with the pipeline as the earlier milestones leave it and keeps what the existing projects show today; that the acceptance checks would really catch failure; that the model, effort and thread advice is sound, with a pipeline milestone at xhigh unless it can say why high is enough; and the specific checks the brief needs (a prior-art branch's distance from the tip, a dependency's source behind a claim the plan relies on, the licence of every asset the plan would take, a rule of the project's a milestone touches). It returns corrections with their evidence and the risks still open; fold the corrections into the plan, keep every prompt paste-ready, and write the open risks as §6.

## 9. Report

Say where the plan is, by its absolute path, and show it:

- in plan mode, call ExitPlanMode, which presents the plan: the editor opens it as a markdown document, and `/plan open` reopens it while the thread stays in plan mode. Say that approval only ends plan mode, since nothing is implemented in this thread; rejection keeps the thread in plan mode for changes. The file stays either way.
- otherwise open it in the editor: `code -r <path>`, or on macOS `open -a "Visual Studio Code" <path>` where the `code` command is not installed; the editor's markdown preview shows it rendered.

Then say the next step: `/executioner <path>` as the first message of a fresh thread, on the strongest model available at high, the executioner saying in its setup message where its work needs more, and that each milestone is run from the handoffs that thread writes.
