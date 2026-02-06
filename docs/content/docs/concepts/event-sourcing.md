---
title: Event Sourcing
weight: 2
---

BlazeTracker doesn't store the current state of your scene at each message. Instead, it stores **events** — discrete changes like "time advanced 30 minutes", "Alice changed position to sitting on the couch", or "Bob's feeling of 'suspicious' toward Alice was removed".

Current state is computed by replaying these events from a starting point. This is called **event sourcing**, and it's why BlazeTracker handles swipes, edits, and corrections so cleanly.

## Why Events Instead of State?

Consider what happens when a user swipes (regenerates) an assistant response at message 5 in a chat with 20 messages of tracked state.

**With stored state:** You'd need to recompute everything from message 5 onward. The old state at messages 6-20 is now wrong because it was based on the previous message 5.

**With events:** Message 5's events are replaced with new events from the new swipe. State at any point is recomputed by replaying events on the canonical swipe path. Messages 6+ automatically reflect the change because their events are still valid (they were extracted from their own messages).

## Event Structure

Every event has:

```typescript
{
  id: string;          // UUID
  source: {
    messageId: number; // Which message produced this event
    swipeId: number;   // Which swipe of that message
  };
  timestamp: number;   // Real-world creation time
  deleted?: boolean;   // Soft delete flag
  kind: string;        // Event category (time, location, character, etc.)
  subkind?: string;    // Specific event type (delta, moved, outfit_changed, etc.)
  // ... event-specific data fields
}
```

## Canonical vs Non-Canonical Events

In SillyTavern, each message can have multiple **swipes** (alternative responses). Only the currently selected swipe is considered **canonical**.

When projecting state, BlazeTracker filters events to only include those from canonical swipes:

```
Message 1 (swipe 0) ← canonical
  ├─ time:initial
  ├─ location:moved
  └─ character:appeared

Message 2 (swipe 0)  ← not canonical (user swiped to swipe 1)
  ├─ character:mood_added     ← excluded from projection
  └─ topic_tone               ← excluded from projection

Message 2 (swipe 1) ← canonical
  ├─ character:mood_added     ← included
  └─ topic_tone               ← included

Message 3 (swipe 0) ← canonical
  └─ time:delta
```

This means all swipes' events are stored, but only the canonical path is used for computing state.

## Soft Deletion

Events are never physically deleted. Instead, they have a `deleted` flag:

```typescript
{
  id: "abc-123",
  kind: "character",
  subkind: "mood_added",
  character: "Alice",
  mood: "anxious",
  deleted: true  // This event is excluded from projection
}
```

Soft deletion means:
- The event editor can show deleted events and let you un-delete them
- The full history is always available for debugging
- Re-extraction at a message soft-deletes old events and creates new ones

## The Event Store

All events for a chat live in the **EventStore**, which is persisted in message 0's extension data. The store provides:

- `appendEvents()` — Add new events from extraction
- `getEvents()` — Get all events (for filtering/projection)
- `softDeleteEventsForMessage()` — Mark all events from a message as deleted (used during re-extraction)
- `projectStateAtMessage()` — Compute projected state up to a message

The event store is the single source of truth. Everything displayed in the UI — the compact block, detail view, narrative modal, relationship editor — is computed from it.

## Re-Extraction

When you re-extract a message (click 🔥 on an already-extracted message):

1. All existing events from that message + swipe are **soft-deleted**
2. Extraction runs fresh for that message
3. New events are appended to the store
4. State recomputes automatically from the new event set

Because events at other messages aren't touched, re-extracting one message doesn't cascade into others.
