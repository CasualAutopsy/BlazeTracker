---
title: Troubleshooting
weight: 5
---

Common issues and how to fix them.

## Initial state is wrong

The first extraction makes assumptions based on limited context. This is normal.

**Fix:** Edit the events on the first assistant message using the ✏️ button. Set the correct time, location, outfits, and relationships. All subsequent extractions will project forward from your corrections. See [Editing State](../guides/editing-state) for details.

To avoid this in future chats, set up [Character Defaults](../guides/character-defaults) for your persona and AI character cards.

## Extraction isn't accurate

Different models respond differently to prompts.

**Fix:** Open Custom Prompts in settings and tune the prompts for your model. Add more explicit instructions, adjust field descriptions, or lower temperatures for more deterministic output. See [Custom Prompts](../guides/custom-prompts).

## Extraction is still inaccurate after tuning

BlazeTracker needs a capable model to reliably follow structured extraction prompts.

**Fix:** Use a larger model. Gemma 3 27B is roughly the minimum for consistent results. If your model can't handle structured JSON extraction, no amount of prompt tuning will help.

## Extraction is too slow

BlazeTracker makes multiple sequential LLM calls per message.

**Fix:** Enable prefix caching in your backend. See [Setup — Enable Prefix Caching](../getting-started/setup#enable-prefix-caching). This lets repeated context be reused across calls, typically reducing extraction time by 60-75%.

## Extraction is still slow with prefix caching

You may be tracking more than you need.

**Fix:** Disable tracking modules you don't care about in **Settings > Tracking**. Each disabled module is one fewer LLM call per message. See [Track Dependencies](../reference/track-dependencies) for the impact of disabling each module.

## Extraction is still too slow

BlazeTracker prioritises accuracy over speed. If latency is a dealbreaker, this may not be the right tool for you.

**Fix:** Try [wTracker](https://github.com/bmen25124/SillyTavern-WTracker) instead. It's lighter weight and designed for simpler use cases.

## JSON parse errors in console

The LLM is returning malformed JSON. This usually means the model isn't capable enough or the "Start reply with" setting is enabled on your extraction connection profile.

**Fix:**
1. Make sure "Start reply with" is **unchecked** on your extraction connection profile
2. Try a more capable model
3. Lower the temperature for the failing extractor
4. Check the [Prompt Prefix](../guides/custom-prompts) setting — some values may confuse certain models

## Weather forecast shows no data

The forecast requires both location and time to be tracked.

**Fix:** Make sure both **Time** and **Location** are enabled in Settings > Tracking. The forecast also requires at least one extraction to have run successfully.

## Connection profile doesn't appear

New connection profiles don't appear in the BlazeTracker settings dropdown until you reload.

**Fix:** Refresh the page after creating a new connection profile in SillyTavern.

## State doesn't update after swipe

State should update automatically when you swipe to a different response. If it doesn't:

**Fix:** The old swipe's events are still stored but filtered out during projection. Click the 🔥 button on the new swipe to extract fresh events. Check the browser console for errors if auto-extract is enabled but not triggering.

## Support

If your issue isn't covered here, visit the [SillyTavern Discord](https://discord.gg/sillytavern) (Resource Forums > extensions) or [open an issue on GitHub](https://github.com/lunarblazepony/BlazeTracker/issues).
