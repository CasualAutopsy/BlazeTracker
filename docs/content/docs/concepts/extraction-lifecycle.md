---
title: Extraction Lifecycle
weight: 1
---

BlazeTracker has two distinct extraction paths: **initial extraction** for the first message in a chat, and **event extraction** for all subsequent messages. Understanding when each runs and what they produce is key to understanding how state flows through the system.

## When Extraction Triggers

Extraction can be triggered in several ways:

| Trigger | What Runs |
|---------|-----------|
| Click 🔥 on message 1 | Initial extraction (creates snapshot) |
| Click 🔥 on message N>1 | Event extraction (produces events) |
| Auto-extract on new message | Event extraction |
| `/bt-extract` | Event extraction on latest message |
| `/bt-extract-remaining` | Event extraction for unprocessed messages |
| `/bt-extract-all` | Clears all state, re-runs initial + events for entire chat |

Auto-extract is controlled by the **Auto Extract** setting. When enabled, extraction runs automatically whenever a new assistant message is received.

## Initial Extraction

Initial extraction runs on the first assistant message and produces a **Snapshot** — a complete state capture that serves as the starting point for all future projections.

The initial pipeline runs extractors in a specific order because some depend on previous results:

```
Time → Location → Forecast → Characters Present → Character Profiles
→ Character Outfits → Relationships → Props → Topic & Tone → Tension
```

Key details:
- Each extractor receives the **partial snapshot** built by previous extractors
- **Forecast** needs both location and time to generate weather
- **Props** runs after outfits to filter worn clothing from nearby objects
- **Character Profiles** and **Outfits** run per-character (one LLM call each)
- **Relationships** runs once with all present characters
- If a **card extension** provides absolute values (e.g., starting time, starting location), the corresponding LLM call is skipped entirely

## Event Extraction

Event extraction runs on every subsequent message. Instead of building a complete snapshot, it detects what *changed* and produces discrete **events**.

The event pipeline runs in phases:

### Phase 1: Core State
```
Time Change → Location Change → Forecast → Topic/Tone Change → Tension Change
```
These are global extractors that run once per message.

### Phase 2: Character Presence
```
Presence Change (appeared/departed)
```
Detects characters entering or leaving the scene.

### Phase 3: Per-Character State
```
For each present character:
  Position/Activity Change → Mood Change → Outfit Change
```
These run **per character** — if 3 characters are present, that's 3 rounds of LLM calls for each extractor type.

### Phase 4: Props
```
Props Change → Props Confirmation
```
Runs after outfit changes so removed clothing can become scene props and picked-up props can be removed.

### Phase 5: Relationship Subjects
```
Subject Detection (global)
```
Identifies what interaction types occurred (conversation, flirt, argument, etc.).

### Phase 6: Per-Pair Relationships
```
For each character pair:
  Relationship Change
```
Updates feelings, secrets, wants, and status for each pair.

### Phase 7: Narrative
```
Narrative Description → Milestone Description
```
Generates a brief summary of what happened and, for first-occurrence milestone subjects, a milestone description.

### Phase 8: Chapters
```
Chapter Ended Detection → Chapter Description
```
Checks if a chapter boundary occurred (location change or time jump) and generates a title/summary if so.

## Abort Handling

Every phase checks for an abort signal before running. If the user stops generation or clicks the 🔥 button during extraction, the pipeline aborts cleanly:

- Events already produced in earlier phases are **not saved** — it's all-or-nothing per turn
- The abort is detected via an `AbortController` signal
- The UI shows the extraction as incomplete

## shouldRun Logic

Not every extractor runs on every message. Each extractor has a `shouldRun` check:

- **Track settings** — If a module is disabled (e.g., `track.climate = false`), its extractors are skipped
- **Run strategy** — Some extractors only run every N turns or when specific conditions are met
- **Dependencies** — If a required extractor produced no results, dependent extractors may skip

This means the actual number of LLM calls per message varies depending on your configuration and what changed in the narrative.
