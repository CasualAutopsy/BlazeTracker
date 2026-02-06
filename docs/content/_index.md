---
title: BlazeTracker
layout: hextra-home
---

{{< hextra/hero-badge >}}
  <span>SillyTavern Extension</span>
{{< /hextra/hero-badge >}}

<div class="hx-mt-6 hx-mb-6">
{{< hextra/hero-headline >}}
  Deep Narrative State Tracking
{{< /hextra/hero-headline >}}
</div>

<div class="hx-mb-12">
{{< hextra/hero-subtitle >}}
  Track time, weather, locations, characters, outfits, relationships,&nbsp;<br class="sm:hx-block hx-hidden" />and story progression across roleplay conversations.
{{< /hextra/hero-subtitle >}}
</div>

<div class="hx-mb-6">
{{< hextra/hero-button text="Get Started" link="docs/getting-started/installation" >}}
</div>

<div class="hx-mt-6"></div>

{{< hextra/feature-grid >}}
  {{< hextra/feature-card
    title="Event-Sourced State"
    subtitle="State is computed from events, not stored statically. Edit any event and all downstream state updates automatically. Swipes and regenerations just work."
  >}}
  {{< hextra/feature-card
    title="Procedural Weather"
    subtitle="Weather is simulated from real climate data, not extracted by the LLM. Internally consistent forecasts without burning tokens."
  >}}
  {{< hextra/feature-card
    title="Relationship Tracking"
    subtitle="Bidirectional feelings, secrets, and wants between character pairs. Full history with milestones from first laugh to first kiss."
  >}}
  {{< hextra/feature-card
    title="Prompt Injection"
    subtitle="Tracked state is injected back into your LLM's context. Story So Far, scene state, recent events, knowledge gaps, and relationships."
  >}}
  {{< hextra/feature-card
    title="Chapter Detection"
    subtitle="Automatic chapter boundaries on location changes and time jumps. Tension graphs show the emotional shape of your story."
  >}}
  {{< hextra/feature-card
    title="Prefix Cache Friendly"
    subtitle="Prompts are split into static system prompts and dynamic user templates. Sequential extraction calls share cached context."
  >}}
{{< /hextra/feature-grid >}}
