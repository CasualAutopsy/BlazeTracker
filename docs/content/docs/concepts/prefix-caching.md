---
title: Prefix Caching
weight: 6
---

BlazeTracker makes **multiple sequential LLM calls** per message — anywhere from 5 to 20+ depending on your configuration and the number of characters present. Without prefix caching, each call processes the full context from scratch. With it, the backend reuses computed context between calls, dramatically reducing latency.

## Why It Matters

Each extraction prompt consists of:

1. **System prompt** — Static instructions that don't change between calls (e.g., "You are a state tracker. Extract the current time from the following messages...")
2. **User template** — Dynamic content with the actual chat messages, previous state, and extraction-specific placeholders

The system prompt and chat messages are largely the **same across all extraction calls for a given turn**. Without prefix caching, the backend processes these repeated tokens from scratch every time. With prefix caching, the KV cache from the first call is reused for subsequent calls, skipping the redundant computation.

## The Impact

For a typical extraction turn with 8 LLM calls:

| | Without Caching | With Caching |
|---|---|---|
| Tokens processed | 8 x full context | 1 x full context + 7 x delta |
| Time (rough) | 8x | ~2-3x |

The exact savings depend on your context length, model size, and backend, but prefix caching typically reduces extraction time by 60-75%.

## How Prompts Are Structured for Caching

BlazeTracker's prompts are deliberately split to maximize cache hits:

```
┌─────────────────────────────────┐
│ System Prompt (static)          │ ← Cached across all calls
│ - Role and instructions         │
│ - Output format specification   │
│ - Field definitions             │
├─────────────────────────────────┤
│ User Template (dynamic)         │ ← Partially cached (messages repeat)
│ - Chat messages                 │ ← Same across calls
│ - Previous state context        │ ← Same across calls
│ - Extraction-specific data      │ ← Different per extractor
└─────────────────────────────────┘
```

The system prompt and chat messages (the bulk of the context) are identical across calls, so they hit the cache. Only the extraction-specific suffix changes.

## Prompt Prefix and Suffix

The **Prompt Prefix** and **Prompt Suffix** settings let you prepend or append text to all extraction prompts. A common use case:

```
Prompt Prefix: /nothink
```

Some models (like QwQ) support a `/nothink` mode that disables chain-of-thought reasoning, producing faster structured output. Since extraction prompts ask for JSON responses, extended thinking is usually unnecessary.

## Backend Configuration

See [Setup — Enable Prefix Caching](../../getting-started/setup#enable-prefix-caching) for backend-specific configuration instructions.

### Cache Slot Sizing (KoboldCpp)

KoboldCpp's `--smartcache N` allocates N cache slots in system RAM. Each slot stores a full context's worth of KV cache. Guidelines:

- **Minimum useful:** 12 slots (fewer and the cache churns too fast)
- **Recommended:** 18 slots
- **Memory per slot:** Varies by model — roughly (context_length × model_hidden_dim × 2 × num_layers × bytes_per_param) per slot

For reference:
- QwQ 32B, 32K context: ~2.5GB per slot
- GLM 4 358B, 32K context: ~11GB per slot

Check your system RAM before allocating too many slots.
