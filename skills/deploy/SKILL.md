---
name: deploy
description: Deploy main to the project's live folder on this machine. Builds main's committed files in a temp folder with npm ci and npm run build, then copies the build into the live folder, skipping files that already match, removes the asset files older builds left behind, and runs the extra steps the project's own settings file adds. The checkout, its build folder and any uncommitted change are never touched. Run by hand only, when a merged batch should go live.
argument-hint: "[--branch <name>] [--dry-run]"
disable-model-invocation: true
allowed-tools:
  - Bash(node ${CLAUDE_SKILL_DIR}/scripts/deploy.mjs *)
metadata:
  baseline: 2026-11-17
---

# Deploy to the live folder

Arguments: $ARGUMENTS

Run the script once, from the project's checkout, with the arguments as given:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/deploy.mjs $ARGUMENTS
```

- `--branch <name>` deploys that local branch's committed state in place of `main`. Nothing else picks the branch: what is checked out, and any uncommitted change, never reaches the live folder.
- `--dry-run` builds and lists what would be copied and removed, and changes nothing.
- `--live <dir>` names the live folder for this run alone. A project's settings file, `.claude/deploy.config.mjs`, can add options of its own; `--help` lists them.

## Rules

- The script is the whole of the deploy, and it alone writes to the live folder. Never copy, move or delete anything there by hand, and never merge, push, switch branches or run `npm` in the checkout.
- Where it stops, relay its message and the files it says it copied before stopping, if any, and leave the fix to the user.
- Where it says the clone or the machine doesn't say where the live folder is, give the one command it printed, `git config deploy.live <dir>` or `git config --global deploy.liveRoot <dir>`, and stop: the folder is the user's to name, and it is never guessed. Those settings live in git config, outside the project, so no path on this machine enters its history; keep such paths, and hosts, out of anything tracked. A project's settings file holds at most the folder's name, as `liveName`.
- A permission error writing to the live folder comes from the thread's sandbox: say that the same command runs from a terminal.

## Report

A few lines:
- the branch, commit and version deployed, or that it was a dry run
- each note it printed, such as unpushed commits, a checked-out branch ahead of the one deployed, a branch other than `main`, or a file a page loads that the live folder lacks
- what it copied, or that everything already matched, and how many older asset files it removed or kept
- the line it ends on, which names what is now live
