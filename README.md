# Claude-Skills
Claude skills to accelerate and enhance project workflow by compiling briefs into precise execution plans, running those plans milestone by milestone from a manager thread, and autonomously analyzing, staging, and committing workspace changes.

## Skills

- [execution-runbook](skills/execution-runbook/) — `/execution-runbook` turns a brief into an
  execution plan: the rules every thread works by, the design in one place, the milestones in
  execution order, each with its seams, acceptance checks, model and effort, a paste-ready prompt
  and its commit, the verification of the finished work, and the executioner's own contract. It
  writes one file outside the repository, names it and shows it, and changes nothing else. See its
  [README](skills/execution-runbook/README.md).
- [executioner](skills/executioner/) — `/executioner` makes a fresh thread the manager of that
  plan: it hands each milestone's prompt to a fresh thread, reviews each result against the plan's
  acceptance checks, folds the corrections into the plan, says how to proceed, and ends every
  message with the effort the next turn needs. It reads everything and writes only the plan. See
  its [README](skills/executioner/README.md).
- [commit](skills/commit/) — `/commit` reviews everything since the last reviewed point, fixes
  what can still be fixed, commits the working tree as itemised commits with real messages, keeps
  the README and docs true, and ends with a version commit, with a changelog section, where the
  project keeps them. It never pushes. Runs as it is in a new repository; the settings at the top
  of the skill and of its scan adapt it to a project. See its [README](skills/commit/README.md).

## The workflow

The three skills are one loop. A brief goes to `/execution-runbook` in a fresh thread, which
explores the code, asks the decisions the brief leaves open, writes the plan and stress-tests it.
`/executioner` then opens the plan in another fresh thread and hands over the first milestone's
prompt; each milestone runs in its own fresh thread on the model and effort the plan names, makes
ordinary content commits, and ends with a verdict. On a `CLEAR` the user runs `/commit` for the
review, the version and the changelog section, then says "Continue" to the executioner, which
reviews the result, folds the thread's corrections into the plan, and hands over the next prompt.
The plan file is the state throughout: what each thread needs is in it, and nothing travels by
memory.

## Baseline

This repository is the baseline that project copies are checked against as models, effort
levels, agent fields and tool syntax change. Each skill's frontmatter carries
`metadata.baseline`, the date of the baseline a copy was adapted from, and each skill's README
says how to compare a copy and bring it up to date. This repository's own commits are made with
its copy at [.claude/skills/commit/](.claude/skills/commit/), the first project copy and a worked
example of the comparison.

## Install

Copy a skill's folder into a project's `.claude/skills/`, or into `~/.claude/skills/` to have it
in every project, then run it by name:

```bash
cp -R skills/commit /path/to/project/.claude/skills/commit
```

## Instructions

- [claude-ai.txt](instructions/claude-ai.txt) — the text of the Instructions for Claude setting in
  claude.ai, under Settings > Account, described there as:

  > Claude will keep these in mind for this and any of your associated accounts across chats within Anthropic’s guidelines.

  The file is the source: edit it here, commit it, then copy it into the field with
  `pbcopy < instructions/claude-ai.txt`. It holds exactly what the field holds, line breaks
  included, and nothing else, so it keeps its own wrapping rather than this repository's.
