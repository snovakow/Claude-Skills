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
levels, agent fields and tool syntax change; a project that links a skill instead of copying it
runs the baseline itself, so only copies are checked. Each skill's frontmatter carries
`metadata.baseline`, the date of the baseline a copy was adapted from, and each skill's README
says how to compare a copy and bring it up to date. This repository's own commits are made with
its copy at [.claude/skills/commit/](.claude/skills/commit/), the first project copy and a worked
example of the comparison.

## Install

Claude Code loads a skill from a folder of the skill's name: in a project's `.claude/skills/` for
that project, or in `~/.claude/skills/` for every project on the machine. The folder can be a link
to the skill's folder here or a copy of it, and either way the skill runs by its name.

### Which one runs

Where `~/.claude/skills/` and a project's `.claude/skills/` both hold a skill of the same name,
`/<name>` in that project runs the one in `~/.claude/skills/`, whether either is a link or a copy.
The project's own version runs only under a name of its own, with its folder and the `name` field
in its `SKILL.md` renamed together, since either one invokes a skill.

### Recommended: in each project

When `~/.claude/skills/` holds nothing of a skill's name, each project runs the one in its own
`.claude/skills/`: one project can link a skill while another keeps its own version under the
same name. The commands run from this repository's root.

**A link** runs the skill as this repository has it. The project reads what this clone holds, so
updating the clone updates every project linked to it, and there is no copy to keep current.
`$PWD` gives the link the absolute path it needs, and the exclude line keeps it out of the
project's history, since it points into this machine's file system:

```bash
mkdir -p /path/to/project/.claude/skills
ln -sn "$PWD/skills/executioner" /path/to/project/.claude/skills/executioner
echo .claude/skills/executioner >> /path/to/project/.git/info/exclude
```

The link reads whatever this clone has on disk, the branch checked out here and uncommitted edits
included, and an edit made through it, by hand or by a thread in the project, is an edit to this
repository.

**A copy** is for a project that needs its own version, such as `/commit` with the project's
settings, or for a skill that is committed with the project, so that every clone of the project
has it. A copy is checked against this repository as its skill's README describes under *Keeping
a copy current*:

```bash
mkdir -p /path/to/project/.claude/skills
cp -R skills/commit /path/to/project/.claude/skills/commit
```

To switch a project between the two, take out what is there first. A link is deleted with a plain
`rm`, which removes the link and nothing it points to, and its line comes out of
`.git/info/exclude` so that a copy can be committed. A copy is moved out of `.claude/skills/`,
since `ln` onto an existing folder puts the link inside it.

### Not recommended: the user level

A link or copy in `~/.claude/skills/` gives every project the skill with nothing to set up per
project, at the cost set out under *Which one runs*: it runs in place of each project's own
version of that name, and every such version must be renamed and run by its new name. It suits a
skill run unmodified in nearly every project, where no project keeps a version of its own. It
suits `/commit` least, since a project copy of `/commit` is adapted by design. It is made with the
same commands, with `~/.claude/skills/` as the destination and no exclude line; as a link it
stays current, and as a copy it is checked like any copy.

## Instructions

- [claude-ai.txt](instructions/claude-ai.txt) — the text of the Instructions for Claude setting in
  claude.ai, under Settings > Account, described there as:

  > Claude will keep these in mind for this and any of your associated accounts across chats within Anthropic’s guidelines.

  The file is the source: edit it here, commit it, then copy it into the field with
  `pbcopy < instructions/claude-ai.txt`. It holds exactly what the field holds, line breaks
  included, and nothing else, so it keeps its own wrapping rather than this repository's.
