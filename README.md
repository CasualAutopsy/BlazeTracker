# BlazeTracker 🔥

A SillyTavern extension that tracks narrative state across roleplay conversations — time, weather, locations, characters, outfits, relationships, and story progression — and injects it back into context to maintain consistency.

Built for longer, slower-burn narratives. Prioritises accuracy over speed.

**[📖 Documentation](https://lunarblazepony.github.io/BlazeTracker/)** — Concepts, guides, and reference.

![Compact view](./img/compact_block.png)

### Is This For You?

**Yes if:** You want deep state tracking, run capable models (Gemma 3 27B+), and don't mind multiple LLM calls per message.

**No if:** You want something lightweight, run small models, or need minimal latency. Try [wTracker](https://github.com/bmen25124/SillyTavern-WTracker) instead.

---

## Installation

### Requirements

- SillyTavern 1.12.0 or later
- Git installed on your system
- A capable LLM (Gemma 3 27B is roughly the minimum for reliable extraction)

### Install via SillyTavern

1. Open SillyTavern
2. Go to **Extensions** → **Install Extension**
3. Paste the repository URL:
   ```
   https://github.com/lunarblazepony/BlazeTracker
   ```
4. Click **Install**
5. Reload SillyTavern

### Manual Installation

1. Navigate to your SillyTavern installation
2. Go to `data/<user>/extensions/` (or `public/scripts/extensions/third-party/` for all users)
3. Clone the repository:
   ```bash
   git clone https://github.com/lunarblazepony/BlazeTracker
   ```
4. Restart SillyTavern

---

## Setup

### Connection Profile

BlazeTracker needs a connection profile to make extraction calls separately from your main chat.

1. Open the connection menu in SillyTavern
2. Click **Add** at the top — this will auto-populate settings from your current connection
3. **Important:** Uncheck "Start reply with" if you have it configured for roleplay
4. Refresh the page (new profiles don't appear in Extensions until you reload)
5. Select your new profile in the BlazeTracker settings panel

### Enable Prefix Caching (Recommended)

BlazeTracker makes multiple sequential LLM calls per message. Prefix caching lets your backend reuse the computed context between calls, significantly reducing latency and compute. See the [docs](https://lunarblazepony.github.io/BlazeTracker/docs/getting-started/setup/#enable-prefix-caching) for backend-specific configuration.

---

## Features

### Compact Message Block

![Compact view](./img/compact_block.png)

Each message displays a compact state summary: date and time, location, weather conditions (with temperature and humidity), scene topic and tone, tension (type, level, and direction), and the three most recent narrative events.

**Toolbar buttons:**
- 📅 **Calendar** (next to weather) — Opens the weather forecast modal
- 🔥 **Fire** — Re-extract state for this message
- ✏️ **Edit** — Open the event editor for this message
- 📖 **Book** — Open the narrative state modal

### Detailed Message Block

![Detailed view](./img/detailed_block.png)

Expand "Details" to see the full scene state: nearby props and complete character cards for everyone present. Each character card shows their position, current activity, mood, physical state, detailed outfit, and their relationship status with other characters in the scene.

### Weather Forecast

![Weather forecast](./img/weather_forecast.png)

Click the 📅 icon to open the weather forecast for the current location. Shows hourly conditions for today (with sunrise and sunset times) and a 7-day forecast with highs, lows, and precipitation chance. All procedurally generated from real climate data — no LLM calls required.

### Narrative State Modal

Click the 📖 button to open the Narrative State modal with three tabs:

#### Relationships

![Relationships tab](./img/relationships_tab.png)

Bidirectional relationship tracking between character pairs. Each side shows what that character feels, knows (secrets), and wants regarding the other. Status levels range from strangers through to intimate. Click Edit to open the relationship editor.

#### Events

![Events tab](./img/events_tab.png)

Story events organised by chapter. Each event shows its timestamp, a narrative summary, location, tension indicators, and which characters witnessed it. These are the high-level beats of your story.

#### Chapters

![Chapters tab](./img/chapters_tab.png)

View chapters with a tension-over-time graph showing how the emotional intensity has progressed. The Y-axis uses tension level icons (from relaxed ☕ up through volatile 🔥) so you can see the shape of your story at a glance.

### Relationship Editor

![Relationship editor](./img/relationship_editor.png)

The relationship editor shows the full event history for a character pair — feelings added, feelings removed, wants changed, status shifts — organised by message. The right panel shows a live preview of the current relationship state as projected from those events. Add, edit, or remove relationship events to correct the tracker's interpretation of how characters feel about each other.

### Event Editor

![Event editor](./img/event_editor.png)

Click the ✏️ button on any message to open the event editor. The left panel shows all events extracted from that message, organised by type:

- **Time Events** — Time deltas applied to the projection (e.g., "+2m", "+1h 30m", "+2d")
- **Character Events** — Activity changes, position changes, outfit changes
- **Relationship Events** — Status changes, arguments, milestones

The right panel shows a live preview of the resulting state. Add, edit, or remove events and see how it affects the tracked state before saving.

### Character Defaults

BlazeTracker lets you pre-configure starting state for both your persona and AI character cards. This means the tracker knows what to expect from the first message — no need to manually correct initial assumptions.

#### Persona Defaults

![Persona defaults button](./img/persona_button.png)

Click the 🔥 button in the Persona panel to configure your character's defaults:

![Persona defaults editor](./img/persona_defaults.png)

- **Starting Outfit** — Set what you're wearing by body slot (head, neck, torso, etc.). Check "Nothing" to explicitly mark a slot as empty; leave blank to let extraction determine it.
- **Profile** — Sex, species, and other character details.

Settings are saved to the extension and apply to all chats using this persona.

#### Character Card Defaults

![Character card defaults button](./img/character_button.png)

Click the 🔥 button in the Character panel to configure an AI character's defaults:

![Character card defaults editor](./img/character_defaults.png)

- **Starting Location** — Area, place, position, and whether it's indoor/outdoor.
- **Starting Time** — When the scene begins.
- **Starting Outfit** — Same body slot system as personas.
- **Profile** — Character details.
- **Relationships** — Initial relationship states with other characters.

These settings are saved to the character card's extension data — if you share the card with another BlazeTracker user, your defaults work for them automatically. Non-BlazeTracker users simply ignore the extra data.

### STScript Commands

BlazeTracker provides commands for automation and batch operations:

| Command | Description |
|---------|-------------|
| `/bt-extract` | Extract state for the most recent message |
| `/bt-extract-remaining` | Extract state for all messages since the last extraction |
| `/bt-extract-all` | Clear all state and re-extract the entire chat from scratch |
| `/bt-event-store` | Open a modal showing all events in the event store |

---

## Troubleshooting

For detailed troubleshooting, see the [docs](https://lunarblazepony.github.io/BlazeTracker/docs/troubleshooting/).

**Initial state is wrong?** Edit the events on the first message using the ✏️ button. All subsequent extractions project from your corrections.

**Extraction isn't accurate?** Tune prompts in Settings → Custom Prompts, or use a larger model.

**Extraction is too slow?** Enable [prefix caching](https://lunarblazepony.github.io/BlazeTracker/docs/getting-started/setup/#enable-prefix-caching) and disable tracking modules you don't need.

---

## Support & Feedback

We have an active thread on the [SillyTavern Discord](https://discord.gg/sillytavern), under Resource Forums > extensions.

---

## Development

```bash
git clone https://github.com/lunarblazepony/BlazeTracker
cd BlazeTracker
npm install
npm run build     # Build to dist/
npm run dev       # Watch mode
npm run typecheck # TypeScript check
npm run lint      # ESLint
npm run format    # Prettier
npm run test      # Vitest
```

Contributions welcome. Please open an issue to discuss significant changes before submitting a PR.

---

## Acknowledgements

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) team for the extensible platform
- [wTracker](https://github.com/bmen25124/SillyTavern-WTracker) for the inspiration
- [Open-Meteo](https://open-meteo.com/) for the climate data API
- Font Awesome for icons

---

## License

MIT License

Copyright (c) 2026 Lunar Blaze

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
