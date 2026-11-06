# link-skill

A `/link-skill` skill for Claude Code. It links a skill of the Claude-Skills clone into a
project's `.claude/skills` and keeps the link out of the project's history: the folder, the link
and the exclude line that this repository's README gives as three commands to run by hand, with
their arguments worked out from where it runs. It runs in the clone, naming the project, or in the
project, naming the clone or nothing; and with nothing after it, which is never a linking
command, it links itself at the user level where it is not there yet and lists the clone's
skills and what the project already has. It removes nothing.

## Install

Nothing, inside the clone: its own `.claude/skills` carries a relative link to this skill,
committed with the repository, so `/link-skill` runs in every clone as soon as it is checked out.
From there, a bare `/link-skill` links it at the user level, `~/.claude/skills/link-skill`, so
that it runs in every repository on the machine, and prints the help; `/link-skill install` does
the link alone. That is a link and never a copy: the skill finds the clone through its own files,
and a copy would have no clone to find. By hand, the same is, from the root of this repository:

```bash
mkdir -p ~/.claude/skills
ln -sn "$PWD/skills/link-skill" ~/.claude/skills/link-skill
```

No exclude line is needed there. It can also be linked into one project like any other skill,
`/link-skill link-skill /path/to/project` from the clone, after which `/link-skill` runs in that
project. A bare run there links it at the user level all the same, and from then on it runs in
every repository; `--help` is the help without that.

## Usage

```
/link-skill                               install this skill at the user level where it is not yet,
                                          then help: the clone's skills and the links in place
/link-skill executioner /path/to/project  in the clone: link into that project
/link-skill executioner project           a bare name is a folder beside the clone
/link-skill executioner                   in a project: link from the clone the skill lives in
/link-skill all /path/to/other-clone      in a project: a path or a name is another clone
/link-skill install                       link this skill itself at the user level, and nothing else
/link-skill --help                        the help, and nothing else
```

Several skills can be named in one run, and `all` names every skill of the clone.

## How it finds the two repositories

The clone is where the skill's own files live: the script's path, resolved through the link to it,
lands in the clone's `skills/link-skill`, so a user-level link knows its clone without guessing,
and a run in a project needs no argument. Where the repository it runs in is a clone, the argument
names the project. Otherwise the repository it runs in is the project, and an argument, if any,
names a different clone. A bare name is a folder beside the repository it runs in. Only a copy of
the skill, which lives in no clone, falls back to a `Claude-Skills` folder beside the project, and
a copy cannot install itself.

## What a run does

- With nothing after it, links this skill at the user level where it is not there yet, then prints
  the help; `install` makes that link and stops, and `--help` prints the help and stops.
- Checks that both are git repositories and that each skill named exists under the clone's
  `skills/`, and lists the clone's skills otherwise.
- Makes `.claude/skills` where it is missing and links each skill with the clone's absolute path.
- Adds `.claude/skills/<name>` to the file `git rev-parse --git-path info/exclude` names, which is
  the right file inside a worktree too, and only where the line is not there yet.
- Leaves a copy, or a link to somewhere else, where it finds one, and says what to take out first,
  as the repository's README says under Install. It never removes anything.
- Notes a skill of the same name under `~/.claude/skills`, which runs in place of the link.
- Reports each link and exclude line, made or already there, and the skills that now run.

## With the other skills

Every other skill's README gives the three commands by hand; this skill runs them with the
arguments filled in. A linked skill runs as this repository has it, so updating the clone updates
every project linked to it, and the link never enters the project's history.

## Keeping a copy current

A copy of this skill lives in no clone, falls back to a `Claude-Skills` folder beside the project
and cannot install itself, so link it instead. Where a copy exists all the same, its frontmatter's
`metadata.baseline` is the date it was adapted from, and the diff of `SKILL.md` and
`scripts/link.mjs` against this repository shows the drift, as with the other skills.
