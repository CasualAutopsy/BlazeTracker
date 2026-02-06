---
title: Custom Prompts
weight: 2
---

Every extraction prompt in BlazeTracker can be customized. This is useful for tuning extraction accuracy for your specific model, adding instructions for edge cases, or changing the output format.

## Prompt Structure

Each extraction prompt has two parts:

### System Prompt

Static instructions that define the extractor's role and output format. This part doesn't change between extraction calls and is designed to be cached by inference backends (see [Prefix Caching](../../concepts/prefix-caching)).

Example:
```
You are a state tracker for a roleplay scene. Extract the current
narrative time from the messages below. Output JSON with fields:
year, month, day, hour, minute, second.
```

### User Template

Dynamic content with placeholders that get filled in at extraction time. This changes per call because it includes the actual chat messages and current state.

Example:
```
Messages:
{{messages}}

Previous time: {{previousTime}}

What is the current narrative time?
```

## Available Placeholders

Each prompt has its own set of available placeholders. Common ones include:

| Placeholder | Description |
|-------------|-------------|
| `{{messages}}` | Recent chat messages |
| `{{characterName}}` | AI character's name |
| `{{userName}}` | User's persona name |
| `{{previousState}}` | Previous extracted state for context |
| `{{characters}}` | List of present characters |
| `{{worldinfo}}` | Lorebook/world info entries (if enabled) |

The exact placeholders available for each prompt are shown in the settings UI when you expand that prompt's customization section.

## Temperature Overrides

Each extractor category has a default temperature:

| Category | Default | Rationale |
|----------|---------|-----------|
| Time | 0.3 | Low for deterministic time parsing |
| Location | 0.5 | Moderate for reasonable location inference |
| Props | 0.5 | Moderate |
| Climate | 0.3 | Low for consistent classification |
| Characters | 0.5 | Moderate |
| Relationships | 0.6 | Slightly higher for nuanced feelings |
| Scene | 0.5 | Moderate |
| Narrative | 0.6 | Slightly higher for creative summaries |

You can override temperatures at two levels:

1. **Category temperature** — Changes the default for all prompts in that category (Settings > Advanced > Category Temperatures)
2. **Per-prompt temperature** — Overrides the category default for a specific prompt

## Tips for Custom Prompts

### For smaller models (27B-32B)

- Be more explicit about output format
- Add example outputs
- Reduce the number of fields requested
- Lower temperatures for more deterministic output

### For larger models (70B+)

- Default prompts usually work well
- Can increase temperatures slightly for more nuanced extraction
- Can add additional instructions for edge cases

### Common customizations

- **Time extraction**: Add timezone handling if your story involves travel
- **Character extraction**: Add species-specific outfit rules (e.g., "tail slot" for non-human characters)
- **Relationship extraction**: Adjust sensitivity for relationship status changes
- **Narrative extraction**: Change the style of event summaries

## Prompt Prefix and Suffix

The **Prompt Prefix** and **Prompt Suffix** settings (under Advanced) are prepended/appended to the user template of **all** prompts. Common use cases:

- `/nothink` prefix for models that support disabling chain-of-thought
- Additional system-level instructions that apply to all extractors
