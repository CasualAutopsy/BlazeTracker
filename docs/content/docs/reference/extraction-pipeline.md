---
title: Extraction Pipeline
weight: 3
---

Detailed pipeline order for both initial and event extraction, including which extractors make LLM calls and which are computed locally.

## Initial Extraction Pipeline

Runs on the first message to create the initial snapshot.

| # | Extractor | Category | LLM Call? | Dependencies |
|---|-----------|----------|-----------|-------------|
| 1 | Time | `time` | Yes (unless card default) | None |
| 2 | Location | `location` | Yes (unless card default) | None |
| 3 | Forecast | `climate` | No (computed) | Location + Time |
| 4 | Characters Present | `characters` | Yes | None |
| 5 | Character Profiles | `characters` | Yes (per character) | Characters Present |
| 6 | Character Outfits | `characters` | Yes (per character) | Characters Present |
| 7 | Relationships | `relationships` | Yes | Characters Present |
| 8 | Props | `props` | Yes | Location + Character Outfits |
| 9 | Topic & Tone | `scene` | Yes | None |
| 10 | Tension | `scene` | Yes | Topic & Tone |

**Total LLM calls:** 6 + (2 × number of characters) minimum

For example, with 2 characters: 6 + 4 = **10 LLM calls** for initial extraction.

Card defaults can reduce this:
- Time from card → skips step 1 (-1 call)
- Location from card → skips step 2 (-1 call)

## Event Extraction Pipeline

Runs on every subsequent message. Organized in phases.

### Phase 1: Core State

| Extractor | Category | LLM Call? | Notes |
|-----------|----------|-----------|-------|
| Time Change | `time` | Yes | |
| Location Change | `location` | Yes | |
| Forecast | `climate` | No (computed) | Triggers on area change or time exceeding range |
| Topic/Tone Change | `scene` | Yes | |
| Tension Change | `scene` | Yes | |

### Phase 2: Character Presence

| Extractor | Category | LLM Call? | Notes |
|-----------|----------|-----------|-------|
| Presence Change | `characters` | Yes | Detects appeared/departed |

### Phase 3: Per-Character State

Runs once **per present character**:

| Extractor | Category | LLM Call? | Notes |
|-----------|----------|-----------|-------|
| Position/Activity Change | `characters` | Yes | Combined in one call |
| Mood Change | `characters` | Yes | |
| Outfit Change | `characters` | Yes | |

### Phase 4: Props

| Extractor | Category | LLM Call? | Notes |
|-----------|----------|-----------|-------|
| Props Change | `props` | Yes | After outfits (clothing ↔ props) |
| Props Confirmation | `props` | Yes | Confirms props still present |

### Phase 5: Relationship Subjects (Global)

| Extractor | Category | LLM Call? | Notes |
|-----------|----------|-----------|-------|
| Subject Detection | `relationships` | Yes | Identifies interaction types |

### Phase 6: Per-Pair Relationships

Runs once **per character pair**:

| Extractor | Category | LLM Call? | Notes |
|-----------|----------|-----------|-------|
| Relationship Change | `relationships` | Yes | Updates feelings/wants/secrets/status |

### Phase 7: Narrative

| Extractor | Category | LLM Call? | Notes |
|-----------|----------|-----------|-------|
| Narrative Description | `narrative` | Yes | Brief summary of what happened |
| Milestone Description | `narrative` | Yes (conditional) | Only for first-occurrence milestone subjects |

### Phase 8: Chapters

| Extractor | Category | LLM Call? | Notes |
|-----------|----------|-----------|-------|
| Chapter Ended | `narrative` | Yes | Detects chapter boundaries |
| Chapter Description | `narrative` | Yes (conditional) | Only when chapter ends |

### Total LLM Calls per Message

With all modules enabled, N characters, and P pairs (P = N×(N-1)/2):

```
Core:           4  (time + location + topic/tone + tension)
Presence:       1
Per-character:  3N (position/activity + mood + outfit per character)
Props:          2  (change + confirmation)
Subjects:       1
Per-pair:       P
Narrative:      1-2 (description + optional milestone)
Chapters:       1-2 (detection + optional description)
────────────────────
Total:          10 + 3N + P  (minimum, all modules on)
```

Examples:
- 2 characters, 1 pair: 10 + 6 + 1 = **17 calls**
- 3 characters, 3 pairs: 10 + 9 + 3 = **22 calls**
- 4 characters, 6 pairs: 10 + 12 + 6 = **28 calls**

### Reducing Call Count

Disable modules you don't need:

| Disable | Calls Saved |
|---------|-------------|
| `props` | 2 per message |
| `scene` (topic/tone + tension) | 2 per message |
| `narrative` (events + chapters) | 2-4 per message |
| `relationships` | 1 + P per message |
| `characters` | 1 + 3N per message |

## shouldRun Logic

Not every extractor runs every time. Each has a `shouldRun` check:

- **Track disabled** → extractor is skipped entirely
- **Run strategy** → some extractors only run on certain conditions (e.g., forecast only when area changes)
- **No relevant changes** → some extractors check if upstream state actually changed

## Computed vs Extracted

Some state is computed locally rather than extracted by the LLM:

| State | Source |
|-------|--------|
| Climate (temperature, conditions, etc.) | Computed from forecast + time + location |
| Forecast | Computed from climate normals + seeded RNG |
| Daylight phase | Computed from latitude + time |
| Indoor temperature | Computed from outdoor temp + building type |
| Narrative event witnesses | Derived from projection state at each message |
| Chapter boundaries (partial) | Detected from location changes + time jumps |
