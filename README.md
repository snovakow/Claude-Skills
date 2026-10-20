# Claude-Skills
Claude skills to accelerate and enhance project workflow by compiling static roadmaps into precise execution guides and autonomously analyzing, staging, and committing workspace changes.

## Skills

- [commit](skills/commit/) — `/commit` reviews everything since the last reviewed point, fixes
  what can still be fixed, commits the working tree as itemised commits with real messages, keeps
  the README and docs true, and ends with a version commit, with a changelog section, where the
  project keeps them. It never pushes. Runs as it is in a new repository; the settings at the top
  of the skill and of its scan adapt it to a project. See its [README](skills/commit/README.md).

## Baseline

This repository is the baseline that project copies are checked against as models, effort
levels, agent fields and tool syntax change. Each skill's frontmatter carries
`metadata.baseline`, the date of the baseline a copy was adapted from, and each skill's README
says how to compare a copy and bring it up to date.

## Install

Copy a skill's folder into a project's `.claude/skills/`, or into `~/.claude/skills/` to have it
in every project, then run it by name:

```bash
cp -R skills/commit /path/to/project/.claude/skills/commit
```
