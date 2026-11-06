# execution-runbook

An `/execution-runbook` skill for Claude Code. It turns a plan laid out beforehand, the source
plan, given by its path or held by the thread that made it, into an execution plan: a markdown
file that names what is built, the decisions and rules every thread works by, the design
in one place, the milestones in execution order, each with its seams, acceptance checks, model and
effort, a paste-ready prompt and its commit, the verification of the finished work, and what was
left out. It names the file, shows it, and changes nothing in the repository. `/executioner` runs
the plan it writes, and `/executioner-guide` answers for it and changes it while it runs.

It is the generic form of two plans the same workflow produced, each of fourteen or fifteen
milestones run one per fresh thread with a manager thread reviewing every result. This skill
carries their shape and the method the threads that wrote them used.

## Install

Link the folder into the project, or copy it there where the project adds rules of its own, and run
`/execution-runbook` in Claude Code: in the thread that made the source plan, with nothing after
the command, or as the first message of a fresh thread, with the source plan's path after it. Plan
mode suits the fresh thread, where the plan becomes that thread's own plan file; in a thread whose
plan file already holds the source plan, plan mode is turned off and the plan goes beside it. A
thread that holds other work, or was continued from a summary, is told to run it fresh instead. A
link runs the skill as this repository has it, with no copy to keep current, and is kept out of the
project's history.

Run these from the root of this repository, the Claude-Skills clone, not from the project.
`/path/to/project` is the root of the project that gets the skill:

```bash
mkdir -p /path/to/project/.claude/skills
ln -sn "$PWD/skills/execution-runbook" /path/to/project/.claude/skills/execution-runbook
echo .claude/skills/execution-runbook >> /path/to/project/.git/info/exclude
```

A copy, for a project's own version, also from the root of the Claude-Skills clone:

```bash
mkdir -p /path/to/project/.claude/skills
cp -R skills/execution-runbook /path/to/project/.claude/skills/execution-runbook
```

A link or copy at `~/.claude/skills/execution-runbook` works in every project but is not
recommended: it runs in place of any project's own `execution-runbook`, which would then need a name
of its own; the repository's [Install](../../README.md#install) says when it suits.

The skill runs by hand only, on the model and effort the thread is set to. It sizes the job from its
survey and says what the source plan calls for: the strongest model the account has, Fable 5.1
where the user's plan includes it, otherwise Opus 5.5, at high for a source plan within one area
and xhigh for one that spans areas, branches or a pipeline change, never max; below that setting
it stops and waits for the change. Its `allowed-tools` pre-approve, for the invoking turn,
read-only git, the Explore and Plan subagents, the question tool, and opening the finished file in
the editor; nothing that changes the repository is approved, and the skill never asks for it. The
plan's folder, `~/.claude/plans`, is a protected one that no rule pre-approves a write in: the
thread's own plan file needs none, and a plan written beside the source plan is asked about in the
default permission mode and judged by auto mode's classifier.

The arguments are an optional version, such as `7.1.0`, and an optional path to the source plan.
The version is what the execution plan's first release carries where the project keeps version
commits, needed only where that number is not the release skill's own bump. For each line the
version leaves open, the skill asks whether the line takes that bump or a jump, the bump
recommended, or, for a line with no version commit yet, its first number. Without a path, the source
plan is the thread's own: the one it made, in plan mode's plan file or in its messages, or one
pasted after the command. A thread that holds none is asked for the path. The source plan's
decisions stand and are not asked again, and its claims about the code are checked against the
tree. The source plan is never overwritten. Plan mode writes only the thread's own plan file, so
where that file holds the source plan the skill stops and says to turn plan mode off, after which
the execution plan goes beside the source plan at
`~/.claude/plans/<repository>-<topic>/execution-plan.md`, or to run it fresh with the path.

## What a run does

1. **Survey.** Takes the facts that frame everything from git and the tree: the branches and their
   versions, the release, executioner and guide skills installed, with the release skill's
   settings, the project's own instructions and the memory notes that bear on the source plan,
   the test count and the build's cautions, the size of what is replaced, and the precedent
   commit whose touched files are the seam list a milestone copies.
2. **Size.** From the survey, the effort the source plan calls for, high or xhigh, stated beside
   the thread's own setting; the run stops and waits where the thread is below it.
3. **Explore.** One Explore subagent per area the source plan touches, very thorough, each asked
   for the seams by name; a Plan subagent checks a risky design choice against the code before it
   is written in. Nothing from the source plan or a note is trusted over the tree.
4. **Decide.** Every choice the source plan leaves open, and each of its decisions the tree
   contradicts, is asked in one question, the recommendation first, before anything is written;
   its other decisions are not asked again. All of them become dated decisions in the plan.
5. **Write.** The plan in its fixed shape: §0 the executioner's contract, §1 the context and the
   rules, §2 the design, §3 the milestones, §4 the verification, §5 what was left out, §6 the open
   risks. It is written in sections behind markers, then checked with grep: no marker left, every
   milestone with Model, Prompt and Commit, every prompt fenced and naming the plan's path, the
   versions consistent, no stale cross-reference.
6. **Stress-test.** A Plan subagent with a fresh context, at xhigh, reviews the plan against the
   tree: the seams exist, each change keeps what the existing projects show, the acceptance checks
   would catch failure, the effort levels are right, and the source plan's specific risks are
   checked. Its corrections are folded in and its open risks become §6.
7. **Report.** The plan's absolute path; the plan shown rendered, through the plan-mode exit in
   plan mode or by opening the file in the editor otherwise; and the next step, `/executioner`
   with nothing after it in the same thread, or with the path as the first message of a fresh
   thread, with `/executioner-guide` beside it, the executioner fresh and the guide in the
   thread that laid out the plan where there is one, since that thread holds the design's
   reasons. Where the executioner skill is not installed, the report says how the plan runs by
   hand: each prompt pasted in order into a fresh thread, the release after each CLEAR, each
   report read against the milestone's acceptance before the next prompt goes out.

## The plan's shape

Every thread that runs a milestone reads the plan and the repository and nothing else, so the
plan restates once what it needs: where work lands and how it is released, what the repository may
never name, the compatibility rule, the test and build commands, the domain's invariants, and the
rule that the plan binds on decisions and acceptance, not on its code facts. Each milestone ends
with a report in a fixed order, a PLAN CORRECTIONS section the executioner folds back into the
plan, a READ THIS EVIDENCE section where the milestone changes the pipeline, and a verdict line,
`CLEAR` or `ACTION NEEDED`, that never softens a failed check into a pass.

Milestones are numbered in execution order, top to bottom: pipeline changes first, each proven to
leave the existing projects identical; then additions in dependency order; a port before the
removal it frees; an editor half after the player half it needs is released; demos and authoring
last; stretch and optional work at the end. Each names its model and effort with the reason, from
Sonnet at medium for a pure rule to Fable or Opus at xhigh for a change that sits ahead of every
frame or every input. Each Commit line names the branch, the content commits, and the release
skill the user runs afterwards, in the thread that skill's rules ask for: a plain `/commit`
wherever the skill's own bump gives the right number, and `/commit <version>` only where it does
not, a jump or a line's first version.

## With the other skills

- `/executioner` runs the plan, in the thread that wrote it or from a fresh thread: it hands each
  prompt over, reviews each result by the plan's acceptance checks, and keeps the plan current. §0
  of the plan is its contract, written in full so the executioner can re-read it from the file
  after its own context has been summarised; the two skills state the same rules, and a change to
  one is a change to the other.
- `/executioner-guide` answers for the plan and changes it while the executioner runs it, in the
  thread that holds the plan's making or in a fresh one given the path. What it adds follows the
  shape this skill lays out, and §0 names the guide thread; where a change cannot wait for the
  plan's order, it redirects the executioner by message, or writes a prompt for the user to paste
  there at its next turn or into a fresh thread, in the same shape.
- `/commit` closes each milestone: a milestone thread makes ordinary content commits, and the user
  runs the release skill afterwards for the review, the version and the changelog section. The
  plan's Commit lines say so, with the version written in only where the release skill's own
  bump would not give it.

## Keeping a copy current

This repository is the baseline; a project that links the skill runs the baseline itself and needs
none of this. The frontmatter's `metadata.baseline` is the date of the baseline a copy was adapted
from. A copy has no settings block of its own: what a project changes is nothing, or the few rules
it adds for its plans. To compare a copy, diff the files, from the root of the Claude-Skills clone,
with `/path/to/project` as the root of the project that holds the copy:

```bash
COPY=/path/to/project/.claude/skills/execution-runbook
grep -n '^  baseline:' skills/execution-runbook/SKILL.md "$COPY/SKILL.md"
diff skills/execution-runbook/SKILL.md "$COPY/SKILL.md"
```

Differences that are the project's own additions stay; the rest is drift to carry over, after
which the copy's `metadata.baseline` is set to this file's.
