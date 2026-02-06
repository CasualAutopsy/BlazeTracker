---
title: Batch Extraction
weight: 5
---

When you need to extract state for multiple messages at once — either catching up after chatting with auto-extract off, or re-extracting an entire chat with new settings.

## Extract Remaining

```
/bt-extract-remaining
```

Finds the last message that has extracted state and runs extraction for every unprocessed message after it.

### When to Use

- You've been chatting with **auto-extract off** and want to catch up
- You started a chat before installing BlazeTracker and want to extract existing messages
- Extraction was interrupted (browser crash, abort) and you want to resume

### How It Works

1. Scans messages to find the last one with extracted events
2. If no extraction exists, runs **initial extraction** on the first message
3. Runs **event extraction** for each subsequent unprocessed message in order
4. Shows progress as each message is processed

### What If Early State Is Wrong?

Since each message's extraction builds on previous state, errors compound. If message 3's location is wrong, every subsequent message will reference the wrong location.

**Fix:** Run `/bt-extract-remaining`, then correct errors at the earliest wrong message using the [event editor](../editing-state). Downstream state updates automatically.

## Extract All

```
/bt-extract-all
```

Clears **all** existing state and re-extracts the entire chat from scratch.

### When to Use

- You've **tuned your prompts** and want to see the results across the whole chat
- State has **drifted significantly** and corrections aren't practical
- You want a **clean slate** after changing track settings

### How It Works

1. Deletes all events, snapshots, and state from the event store
2. Runs **initial extraction** on the first message (creates a new snapshot)
3. Runs **event extraction** for every subsequent message in order
4. Shows progress as each message is processed

{{< callout type="warning" >}}
This operation is slow for long chats. Each message requires a full extraction cycle (5-20+ LLM calls depending on configuration). A 100-message chat could take 10-30 minutes.
{{< /callout >}}

### Reducing Extraction Time

- **Disable unnecessary modules** in Settings > Tracking before running. Each disabled module is one fewer LLM call per message.
- **Enable prefix caching** on your backend (see [Setup](../../getting-started/setup#enable-prefix-caching))
- **Use a faster model** if accuracy is less critical for the batch run

## Aborting

During either batch operation, you can abort by clicking the **stop button** in SillyTavern.

When aborted:
- Events from **completed messages** are kept
- The **current message's** extraction is discarded (all-or-nothing per message)
- You can resume later with `/bt-extract-remaining` — it picks up where you left off

## Progress Tracking

During batch extraction, the UI shows:
- Which message is currently being processed
- Which extraction phase is running (time, location, characters, etc.)
- The total number of messages remaining
