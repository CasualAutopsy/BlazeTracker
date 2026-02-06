---
title: Track Dependencies
weight: 4
---

BlazeTracker's tracking modules have dependencies. When a parent module is disabled, dependent modules are automatically disabled too.

## Dependency Graph

```
time ──────────────┐
                   ├──→ climate
location ──────────┤
    │              │
    └──────────────┼──→ props
                   │
characters ────────┴──→ relationships ──┐
                                       ├──→ narrative
scene ─────────────────────────────────┘
```

## Dependency Rules

| Module | Requires | Why |
|--------|----------|-----|
| **Time** | — | No dependencies |
| **Location** | — | No dependencies |
| **Climate** | Location + Time | Needs coordinates (from location) and datetime (from time) to generate forecasts and look up weather |
| **Props** | Location | Props are nearby objects at the current location |
| **Characters** | — | No dependencies |
| **Relationships** | Characters | Can't track relationships without knowing who's present |
| **Scene** | — | No dependencies |
| **Narrative** | Relationships + Scene | Events reference relationship subjects and tension levels |

## Impact of Disabling Modules

### Disabling Time
- Climate is disabled (no datetime for forecast lookup)
- Time is not tracked or injected
- No time shown in compact block
- Narrative events have no timestamp

### Disabling Location
- Climate is disabled (no coordinates for weather)
- Props is disabled (no location context for nearby objects)
- No location shown in compact/detailed blocks
- Weather forecast is unavailable
- Chapter boundaries from location changes are not detected

### Disabling Climate
- No weather shown in compact block
- Weather forecast modal is empty
- Temperature is not tracked
- No daylight phase in time display

### Disabling Props
- No nearby objects shown in detailed block
- Clothing-to-prop transfers (character removes jacket → jacket appears as prop) don't occur
- Props section omitted from injection

### Disabling Characters
- Relationships is disabled (no characters to relate)
- Narrative is disabled (cascade from relationships)
- No character cards in detailed block
- No character state in injection
- Knowledge gaps are not computed

### Disabling Relationships
- Narrative is disabled (events reference relationship subjects)
- No relationship badges on character cards
- No relationships tab in narrative modal
- Relationship section omitted from injection

### Disabling Scene
- Narrative is disabled (events reference tension)
- No topic, tone, or tension shown
- Tension graph unavailable in chapters tab

### Disabling Narrative
- No narrative events tracked
- No chapters detected
- Events tab and Chapters tab in narrative modal are empty
- Story So Far and Recent Events sections omitted from injection
- No knowledge gaps computed

## Minimal Configurations

### Just time and location
Enable: `time`, `location`
LLM calls per message: ~2

### Time, location, and characters (no relationships)
Enable: `time`, `location`, `characters`
LLM calls per message: ~3 + 3N

### Everything except narrative
Enable: `time`, `location`, `climate`, `props`, `characters`, `relationships`, `scene`
LLM calls per message: ~8 + 3N + P (no narrative/chapter calls)

### Full tracking
Enable: all modules
LLM calls per message: ~10 + 3N + P
