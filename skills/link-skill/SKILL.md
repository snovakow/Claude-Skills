---
name: link-skill
description: Link a skill of the Claude-Skills clone into a project's .claude/skills and keep the link out of the project's history, which the clone's README gives as three commands to run by hand, with their arguments worked out from where it runs, in the clone or in the project; or, with the one word install, link this skill itself at the user level. With nothing after it, which is never a linking command, it links itself at the user level where it is not there yet and lists the clone's skills and the links in place. It removes nothing. Run by hand only; it runs in the clone as checked out, and is the one skill that suits the user level, since it is run from any repository.
argument-hint: "[<skill>... | all] [path or name of the other repository], or install"
disable-model-invocation: true
allowed-tools:
  - Bash(node ${CLAUDE_SKILL_DIR}/scripts/link.mjs *)
metadata:
  baseline: 2026-11-06
---

# Link a skill into a project

Arguments: $ARGUMENTS

The arguments are the skills to link, by name or `all`, and the other repository. In the Claude-Skills clone, that is the project that gets the skill, as a path or as the name of a folder beside the clone. In a project, it is the clone, as a path or as the name of a folder beside the project, or nothing, since the script finds the clone it lives in through the link to it. The one word `install` instead links this skill itself at the user level, `~/.claude/skills/link-skill`, as a link and never a copy, so that it runs in every repository, and does nothing else. With no argument at all, which is never a linking command, the script does that same install where the user-level link is not there yet, and then prints the help: where it is, the clone's skills, what the project's `.claude/skills` already holds, and the user-level link's state. `--help` is the help alone.

## What the turn does

1. Run the script once, from the directory the thread is in, with the arguments as given:

   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/link.mjs $ARGUMENTS
   ```

   It makes `.claude/skills` where it is missing, links each skill with the clone's absolute path, and adds `.claude/skills/<name>` to the project's exclude file where that line is not there yet. A link already in place is left as it is, with its exclude line checked. On `install`, or with nothing after it, it makes the user-level link the same way, with no exclude line, since nothing there is a repository.
2. Relay what it printed, in a few lines: each link made or already there, each exclude line added or already there, and the skills that now run in the project, or at the user level. Where it printed help, give the help, with the one thing that was missing named first, and where a bare run installed the skill, say so first.
3. Where it skipped a skill because a copy or a link to somewhere else is there, say so and stop: taking that out is the user's, as the clone's README says under Install, and nothing is removed from here. Where it noted a skill of the same name under `~/.claude/skills`, say that the user-level one runs in place of the link in every project.

## Rules

- The script is the whole of the work: nothing is linked, made or edited by hand, and nothing is ever removed.
- The one command is pre-approved for the turn the skill opens; the thread's permission mode is whatever the user set.
