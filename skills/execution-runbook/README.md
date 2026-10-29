# execution-runbook

An `/execution-runbook` skill for Claude Code. It turns a brief into an execution plan: a
markdown file that names what is built, the decisions and rules every thread works by, the design
in one place, the milestones in execution order, each with its seams, acceptance checks, model and
effort, a paste-ready prompt and its commit, the verification of the finished work, and what was
left out. It names the file, shows it, and changes nothing in the repository. `/executioner` runs
the plan it writes.

It is the generic form of two plans the same workflow produced, each of fourteen or fifteen
milestones run one per fresh thread with a manager thread reviewing every result. This skill
carries their shape and the method the threads that wrote them used.

## Install

Link the folder into the project, or copy it there where the project adds rules of its own, and run
`/execution-runbook` in Claude Code, best as the first message of a fresh thread in plan mode, with
the brief after the command. A link, made from this repository's root, runs the skill as this
repository has it, with no copy to keep current, and is kept out of the project's history:

```bash
mkdir -p /path/to/project/.claude/skills
ln -sn "$PWD/skills/execution-runbook" /path/to/project/.claude/skills/execution-runbook
echo .claude/skills/execution-runbook >> /path/to/project/.git/info/exclude
```

A copy, for a project's own version:

```bash
mkdir -p /path/to/project/.claude/skills
cp -R skills/execution-runbook /path/to/project/.claude/skills/execution-runbook
```

A link or copy at `~/.claude/skills/execution-runbook` works in every project but is not
recommended: it runs in place of any project's own `execution-runbook`, which would then need a name
of its own; the repository's [Install](../../README.md#install) says when it suits.

The skill runs by hand only, on the model and effort the thread is set to. It sizes the job from its
survey and says what the brief calls for: the strongest model the account has, Fable 5.1 where the
user's plan includes it, otherwise Opus 5.5, at high for a brief within one area and xhigh for one
that spans areas, branches or a pipeline change, never max; below that setting it stops and waits
for the change. Its `allowed-tools` pre-approve, for the invoking turn, read-only git, the Explore
and Plan subagents, the question tool, edits under `~/.claude/plans`, and opening the finished file
in the editor; nothing that changes the repository is approved, and the skill never asks for it.

The arguments are an optional version, such as `7.1.0`, and the brief. The version is what the
plan's first release carries where the project keeps version commits; without one, the skill asks
which number the line starts at.

## What a run does

1. **Survey.** Takes the facts that frame everything from git and the tree: the branches and their
   versions, the release skill installed and its settings, the project's own instructions and the
   memory notes that bear on the brief, the test count and the build's cautions, the size of what
   is replaced, and the precedent commit whose touched files are the seam list a milestone copies.
2. **Size.** From the survey, the effort the brief calls for, high or xhigh, stated beside the
   thread's own setting; the run stops and waits where the thread is below it.
3. **Explore.** One Explore subagent per area the brief touches, very thorough, each asked for the
   seams by name; a Plan subagent checks a risky design choice against the code before it is
   written in. Nothing from a brief or a note is trusted over the tree.
4. **Decide.** Every choice the brief leaves open is asked in one question, the recommendation
   first, before anything is written; the answers become dated decisions in the plan.
5. **Write.** The plan in its fixed shape: §0 the executioner's contract, §1 the context and the
   rules, §2 the design, §3 the milestones, §4 the verification, §5 what was left out, §6 the open
   risks. It is written in sections behind markers, then checked with grep: no marker left, every
   milestone with Model, Prompt and Commit, every prompt fenced and naming the plan's path, the
   versions consistent, no stale cross-reference.
6. **Stress-test.** A Plan subagent with a fresh context, at xhigh, reviews the plan against the
   tree: the seams exist, each change keeps what the existing projects show, the acceptance checks
   would catch failure, the effort levels are right, and the brief's specific risks are checked.
   Its corrections are folded in and its open risks become §6.
7. **Report.** The plan's absolute path; the plan shown rendered, through the plan-mode exit in
   plan mode or by opening the file in the editor otherwise; and the next step, `/executioner`
   with the path as the first message of a fresh thread.

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
skill the user runs afterwards, `/commit <version>` for a line's first release and a plain
`/commit` after, in the thread that skill's rules ask for.

## With the other skills

- `/executioner` runs the plan from a fresh thread: it hands each prompt over, reviews each result
  by the plan's acceptance checks, and keeps the plan current. §0 of the plan is its contract,
  written in full so the executioner can re-read it from the file after its own context has been
  summarised; the two skills state the same rules, and a change to one is a change to the other.
- `/commit` closes each milestone: a milestone thread makes ordinary content commits, and the user
  runs the release skill afterwards for the review, the version and the changelog section. The
  plan's Commit lines say so, with the version written in only for a line's first release.

## Keeping a copy current

This repository is the baseline; a project that links the skill runs the baseline itself and needs
none of this. The frontmatter's `metadata.baseline` is the date of the baseline a copy was adapted
from. A copy has no settings block of its own: what a project changes is nothing, or the few rules
it adds for its plans. To compare a copy, diff the files:

```bash
COPY=/path/to/project/.claude/skills/execution-runbook
grep -n 'baseline:' skills/execution-runbook/SKILL.md "$COPY/SKILL.md"
diff skills/execution-runbook/SKILL.md "$COPY/SKILL.md"
```

Differences that are the project's own additions stay; the rest is drift to carry over, after
which the copy's `metadata.baseline` is set to this file's.
