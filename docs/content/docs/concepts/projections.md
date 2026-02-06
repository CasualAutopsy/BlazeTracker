---
title: Projections
weight: 3
---

A **projection** is the computed state at a specific message. Projections are never stored — they're computed on demand by applying events to a snapshot.

## Snapshots

Snapshots are the starting points for projection. There are two types:

### Initial Snapshot

Created by the [initial extraction](../extraction-lifecycle) on the first message. Contains the complete baseline state: time, location, characters, outfits, relationships, scene, and forecasts.

### Chapter Snapshots

Created at chapter boundaries. When a chapter ends, BlazeTracker saves a snapshot of the projected state at that point. This means projecting state for message 50 doesn't require replaying all events from message 1 — it can start from the most recent chapter snapshot.

## How Projection Works

```
Snapshot → filter events (canonical, active, up to target message) → apply in order → compute climate → Projection
```

Step by step:

1. **Find the best snapshot** — The most recent snapshot before the target message (either the initial snapshot or a chapter snapshot)
2. **Filter events** — Keep only events that are:
   - From **canonical swipes** (currently selected swipe for each message)
   - **Not deleted** (soft-deleted events are excluded)
   - From messages **after the snapshot** and **up to the target message**
3. **Sort events** — By message ID, then by timestamp within the same message
4. **Apply events** — Each event mutates the projection state (add a mood, change position, advance time, etc.)
5. **Compute climate** — After all events are applied, climate is computed deterministically from the forecast data + current time + current location. Climate is a derived value, not an event.
6. **Compute narrative events** — Narrative description events are combined with state at each message (witnesses, location, tension) to produce display-ready narrative events

## What's in a Projection

```typescript
interface Projection {
  time: moment.Moment | null;
  location: LocationState | null;
  forecasts: Record<string, LocationForecast>;
  climate: ClimateForecast | null;
  scene: SceneState | null;
  characters: Record<string, CharacterState>;
  relationships: Record<string, RelationshipState>;
  currentChapter: number;
  charactersPresent: string[];
  narrativeEvents: NarrativeEvent[];
}
```

Key distinction from snapshots:
- **Projections** use `moment.Moment` for time (easy to manipulate, format, compare)
- **Snapshots** use ISO strings for time (JSON-serializable for storage)

## Climate is Computed, Not Stored

Climate (temperature, humidity, conditions, wind, daylight phase) is **not** stored as an event. It's computed deterministically from:

- The **forecast** for the current area (a 28-day hourly forecast generated when entering an area)
- The current **time** (to look up the right hour)
- The current **location type** (indoor locations adjust temperature based on building type)

This means climate automatically updates when time or location changes, without needing a separate extraction step. See [Procedural Weather](../procedural-weather) for how forecasts are generated.

## Swipe Context

Projection needs to know which swipe is canonical for each message. This is provided by a **SwipeContext**:

```typescript
interface SwipeContext {
  getCanonicalSwipeId(messageId: number): number;
}
```

In practice, this reads from SillyTavern's chat array, where each message has a `swipe_id` property indicating the currently selected swipe.

## Performance: Chapter Snapshots

Without chapter snapshots, projecting state at message 100 would require replaying all events from message 1. Chapter snapshots act as checkpoints:

```
Initial Snapshot (msg 1)
  → Events msgs 1-30
  → Chapter 0 ends → Chapter Snapshot (msg 30)
      → Events msgs 31-65
      → Chapter 1 ends → Chapter Snapshot (msg 65)
          → Events msgs 66-100 ← only these need replaying
```

This keeps projection fast even in long conversations.
