Stage all changes, create a commit, and push to origin.

Steps:
1. Run `git status` to see what's changed.
2. Run `git diff --stat` for a quick summary.
3. Ask the user for a commit message if none was provided as `$ARGUMENTS`. If `$ARGUMENTS` is non-empty, use it as the commit message directly.
4. Stage all modified/new files (use `git add -A` unless the user specified particular files).
5. Commit with the message.
6. Push to `origin` on the current branch.

Report the final git status and the push result.
