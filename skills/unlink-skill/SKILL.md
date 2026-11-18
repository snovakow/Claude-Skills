---
name: unlink-skill
description: Take a skill's link out of a project's .claude/skills and its line out of the project's exclude file, the reverse of /link-skill and of the plain rm the clone's README gives, with the arguments worked out from where it runs, in the project or in the clone naming the project. With nothing after it, in a project it takes out every link to a skill of a Claude-Skills clone, and in the clone it takes /link-skill and itself out of the user level, where /link-skill installs both, and lists the repositories beside the clone that still link a clone's skills. It removes links and their exclude lines only, never a copy, a file, anything committed or anything a link points to. Run by hand only.
argument-hint: "[<skill>... | all] [the project's path or name, in the clone]"
disable-model-invocation: true
allowed-tools:
  - Bash(node ${CLAUDE_SKILL_DIR}/scripts/unlink.mjs *)
metadata:
  baseline: 2026-11-18
---

# Unlink a skill from a project

Arguments: $ARGUMENTS

The arguments are the skills to take out, by the names of their links under the project's `.claude/skills`, or `all`, and, in the Claude-Skills clone, the project last, as a path or as the name of a folder beside the clone. In a project nothing else is needed: the links and the exclude file are the project's own, and a link named comes out wherever it points. `all` takes out every link to a skill of a Claude-Skills clone, which is what `/link-skill` and the clone's README put there, and every `.claude/skills/<name>` line of the exclude file left behind by a link already taken out by hand; a link to anywhere else stays unless it is named. With no argument at all, a run in a project does what `all` does. In the clone it takes `~/.claude/skills/link-skill` and `~/.claude/skills/unlink-skill` out of the user level, the links that `/link-skill install`, or a bare `/link-skill` in the clone, makes, each where it is a link, and then prints the help: the repositories beside the clone that still link a clone's skills, and the state of the two user-level links. `--help` is the help alone, and in a project, or in the clone with the project named and no skill, it shows what the project's `.claude/skills` holds and what `all` would take out.

## What the turn does

1. Run the script once, from the directory the thread is in, with the arguments as given:

   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/unlink.mjs $ARGUMENTS
   ```

   For each skill it removes the link at `.claude/skills/<name>`, which removes the link and nothing it points to, and takes the line `.claude/skills/<name>` out of the file `git rev-parse --git-path info/exclude` names, leaving the rest of the file as it was. Every worktree of a repository shares that file, so a line stays while another worktree still has something at that path, and the run names the worktree. Where no link is there, it takes out a line left behind all the same. At the user level there is no exclude line, since nothing there is a repository.
2. Relay what it printed, in a few lines: each link taken out and where it pointed, each exclude line taken out or kept, and the skills unlinked. Where a bare run in the clone took `/link-skill` and `/unlink-skill` out of the user level, say so first, and that both still run in the clone, where a bare `/link-skill` links them at the user level again; where it printed help, give the help.
3. Where it skipped something, say what stays and stop: a copy, a file and anything the repository has committed are never taken out here, and a copy keeps its exclude line. Moving a copy out of `.claude/skills`, or removing a committed path, is the user's, as a change to the project. Where it noted a skill of the same name under `~/.claude/skills`, say that the user-level one still runs in the project. Where it could not remove a link or edit the exclude file, give the error it printed; a permission error is likely the thread's sandbox, and the same command runs from a terminal.

## Rules

- The script is the whole of the work: nothing is removed, edited or moved by hand, and nothing but a link and its exclude line is ever removed.
- The one command is pre-approved for the turn the skill opens; the thread's permission mode is whatever the user set.
