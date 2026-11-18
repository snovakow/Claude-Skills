# unlink-skill

A `/unlink-skill` skill for Claude Code, the reverse of [`/link-skill`](../link-skill/README.md). It
takes a skill's link out of a project's `.claude/skills` and the link's line out of the project's
exclude file: the plain `rm` and the line taken out by hand that this repository's README gives
under Install, with their arguments worked out from where it runs. It runs in the project, naming
the skills, or in the clone, naming the skills and the project. With nothing after it at all, in a
project it takes out every link to a skill of a Claude-Skills clone, and in the clone it takes
`/link-skill` and itself out of the user level, where `/link-skill` installs both. It removes links
and their exclude lines, and nothing else.

## Install

Nothing, inside the clone: its own `.claude/skills` carries a relative link to this skill,
committed with the repository, so `/unlink-skill` runs in every clone as soon as it is checked
out, and from there it reaches any project by name. In every other repository it runs from the
user level, where `/link-skill install`, or a bare `/link-skill` in the clone, links it beside
`/link-skill`, since both are run from any repository and no project keeps a version of its own;
a bare `/unlink-skill` in the clone takes both out again. A bare `/link-skill` in a project leaves
it out for that reason, and `/link-skill unlink-skill` links it into one project alone. By hand,
the user-level link is, from the root of this repository:

```bash
mkdir -p ~/.claude/skills
ln -sn "$PWD/skills/unlink-skill" ~/.claude/skills/unlink-skill
```

## Usage

```
/unlink-skill                                in a project: take out every link to a skill of a clone
/unlink-skill                                in the clone: take /link-skill and itself out of the
                                             user level, then the help
/unlink-skill executioner                    in a project: take out that link, wherever it points
/unlink-skill all                            in a project: the same as nothing at all
/unlink-skill executioner /path/to/project   in the clone: take it out of that project
/unlink-skill executioner project            a bare name is a folder beside the clone
/unlink-skill all project                    in the clone: every link to a clone's skill there
/unlink-skill project                        in the clone: what that project's .claude/skills holds
/unlink-skill --help                         the help, and nothing else
```

Several skills can be named in one run.

## How it finds the project and the links

The project is the repository it runs in, unless that is a Claude-Skills clone, one whose
`skills/` folder holds skills; there the last argument names the project, as a path or as the name
of a folder beside the clone, as with `/link-skill`. No clone is needed in a project: a link says
where it points, and a link to a skill of a clone points to `<clone>/skills/<name>`, which is what
`/link-skill` and the README's commands make. A link whose target is gone, as when the clone has
moved, is judged by the shape of the path it holds, and a link that lands in a `.claude/skills`
folder, a project's or the user level's, is no clone's. A link named comes out wherever it points;
only `all` and a bare run ask where.

## What a run does

- With nothing after it in a project, or with `all`: takes out every link to a skill of a clone,
  and every `.claude/skills/<name>` line of the exclude file whose path holds nothing in any
  worktree, then lists what stays. With nothing after it in the clone: takes
  `~/.claude/skills/link-skill` and `~/.claude/skills/unlink-skill` out of the user level, each
  where it is a link, then prints the help, which lists the repositories beside the clone that
  still link a clone's skills. `--help` prints the help and stops.
- Removes each link as a link, which never touches what it points to.
- Takes the line `.claude/skills/<name>` out of the file `git rev-parse --git-path info/exclude`
  names, every copy of it, and leaves the rest of the file as it was, ending on a newline. Every
  worktree of a repository shares that file, so a line stays while another worktree still has
  something at that path, and the run names the worktree.
- Leaves a copy, a file, and anything the repository has committed, and says what stays; a copy
  keeps its exclude line. The `.claude/skills` folder stays, empty or not.
- Notes a skill of the same name under `~/.claude/skills`, which still runs in the project.
- Reports each link taken out and where it pointed, and each exclude line taken out or kept.

## With the other skills

`/link-skill` makes the folder, the link and the exclude line, and this takes out the link and the
line. A link runs the clone's version, so taking it out changes nothing in the clone, and the
project's history never held it. To switch a project from a link to a copy, take the link out
here, then copy the skill in and commit it, as the repository's README says under Install; a copy
is never taken out here, and moving one out of `.claude/skills` is the user's.

## Keeping a copy current

A copy works as the link does, since the skill needs nothing from the clone it came from, but link
it all the same, so that it stays current. Where a copy exists, its frontmatter's
`metadata.baseline` is the date it was adapted from, and the diff of `SKILL.md` and
`scripts/unlink.mjs` against this repository shows the drift, as with the other skills.
