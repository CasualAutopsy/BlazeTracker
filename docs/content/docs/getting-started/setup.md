---
title: Setup
weight: 2
---

## Connection Profile

BlazeTracker makes LLM calls separately from your main chat. It needs its own connection profile so extraction prompts don't interfere with your roleplay settings.

1. Open the **connection menu** in SillyTavern
2. Click **Add** at the top — this auto-populates settings from your current connection
3. **Important:** Uncheck "Start reply with" if you have it configured for roleplay
4. Refresh the page (new profiles don't appear in Extensions until you reload)
5. Select your new profile in the **BlazeTracker settings panel**

{{< callout type="warning" >}}
If "Start reply with" is enabled on your extraction profile, the LLM will prepend roleplay text to its JSON responses, causing parse failures.
{{< /callout >}}

## Enable Prefix Caching

BlazeTracker makes multiple sequential LLM calls per message. Prefix caching lets your backend reuse computed context between calls, significantly reducing latency and compute. See the [Prefix Caching concept page](../../concepts/prefix-caching) for details on why this matters.

### KoboldCpp

```bash
# Add to your launch command
--smartcache 18
```

The number is how many cache slots to allocate. Each slot stores a full context's worth of KV cache in system RAM (not VRAM), so memory usage scales with context length and model size. You need at least 12 slots to see meaningful benefit; fewer than that and the cache churns too quickly to help.

Memory usage varies significantly by model: 18 slots with GLM 4 358B at full context uses ~200GB RAM, while the same setup with QwQ 32B uses ~48GB. Check your system memory before going too high.

### Aphrodite

```bash
--enable-prefix-caching
```

### vLLM

```bash
--enable-prefix-caching
```

### TabbyAPI

In your `config.yml`:
```yaml
cache:
  prompt_cache: true
```

### llama.cpp / llama-server

```bash
--cache-prompt
```

## Next Steps

You're ready to [run your first extraction](../first-extraction).
