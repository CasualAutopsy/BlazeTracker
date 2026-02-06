---
title: Installation
weight: 1
---

## Requirements

- **SillyTavern 1.12.0** or later
- **Git** installed on your system
- A **capable LLM** — Gemma 3 27B is roughly the minimum for reliable extraction

### Is BlazeTracker For You?

**Yes if:** You want deep state tracking, run capable models (Gemma 3 27B+), and don't mind multiple LLM calls per message.

**No if:** You want something lightweight, run small models, or need minimal latency. Try [wTracker](https://github.com/bmen25124/SillyTavern-WTracker) instead.

## Install via SillyTavern

1. Open SillyTavern
2. Go to **Extensions** > **Install Extension**
3. Paste the repository URL:
   ```
   https://github.com/lunarblazepony/BlazeTracker
   ```
4. Click **Install**
5. Reload SillyTavern

## Manual Installation

1. Navigate to your SillyTavern installation
2. Go to `data/<user>/extensions/` (or `public/scripts/extensions/third-party/` for all users)
3. Clone the repository:
   ```bash
   git clone https://github.com/lunarblazepony/BlazeTracker
   ```
4. Restart SillyTavern

## Next Steps

Once installed, you'll need to [set up a connection profile](../setup) before BlazeTracker can extract state.
