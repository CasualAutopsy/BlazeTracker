---
title: Slash Commands
weight: 3
---

BlazeTracker provides STScript commands for automation and batch operations. These are used in SillyTavern's command input or in Quick Replies.

## Command Reference

### /bt-extract

Extract state for the **most recent message**.

```
/bt-extract
```

Runs event extraction (or initial extraction if it's the first message). Equivalent to clicking the 🔥 button on the latest message.

### /bt-extract-remaining

Extract state for all messages **since the last extraction**.

```
/bt-extract-remaining
```

Finds the last message that has extracted state and runs extraction for every unprocessed message after it. Useful when you've been chatting with auto-extract off and want to catch up.

If no messages have been extracted yet, this runs initial extraction on the first message, then event extraction for everything after it.

### /bt-extract-all

**Clear all state** and re-extract the entire chat from scratch.

```
/bt-extract-all
```

{{< callout type="warning" >}}
This deletes all existing events, snapshots, and state. It then runs initial extraction on the first message and event extraction for every subsequent message. This is a slow operation for long chats — expect one extraction cycle per message.
{{< /callout >}}

Use this when:
- You've changed prompts and want to re-extract with the new settings
- State has drifted significantly and corrections aren't practical
- You want a clean slate after major prompt tuning

### /bt-event-store

Open a modal showing **all events** in the event store.

```
/bt-event-store
```

Displays the raw event data for debugging. Shows every event (including soft-deleted ones) grouped by message, with their kind, subkind, and data fields.

## Choosing the Right Command

| Situation | Command |
|-----------|---------|
| Just want to extract the latest message | `/bt-extract` |
| Chatted for a while with auto-extract off | `/bt-extract-remaining` |
| Changed prompts, want fresh extraction | `/bt-extract-all` |
| Something looks wrong, need to debug | `/bt-event-store` |

## Aborting Batch Operations

During `/bt-extract-remaining` or `/bt-extract-all`, you can abort by clicking the stop button in SillyTavern. Events from completed messages are kept; the current message's extraction is discarded.

## Using in Quick Replies

These commands work in SillyTavern's Quick Reply system. For example, you could create a Quick Reply button that runs `/bt-extract` after every message for manual-trigger workflows.
