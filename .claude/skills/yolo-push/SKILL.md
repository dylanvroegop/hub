---
name: yolo-push
description: Commit all changes and push to GitHub with a random, fun commit message.
disable-model-invocation: true
allowed-tools: Bash
---

# yolo-push

Commit all changes and push to GitHub with a random, fun commit message.

## Steps

1. Run `git add -A` to stage all changes.
2. Generate a random, humorous commit message. Pick one at random from styles like:
   - Pop culture references ("I am inevitable" / "This is the way")
   - Vague but confident ("trust me bro" / "it works on my machine")
   - Dramatic ("the final fix... for real this time" / "mass destruction")
   - Self-aware ("random commit message go brrr" / "¯\_(ツ)_/¯")
   - Single-word energy ("yeet" / "bruh" / "vibes")
   - Mix of styles — be creative and never repeat the same message twice in a row.
3. Commit with that message. End the message with:
   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
4. Push to the current remote branch (use `git push`, or `git push -u origin <branch>` if no upstream is set).
5. Show the user the commit message that was used and confirm the push succeeded.

## Important

- Do NOT ask the user for a commit message — the whole point is it's random.
- Do NOT use `git add .` — use `git add -A` to catch deletions and renames.
- If there are no changes to commit, tell the user and stop.
