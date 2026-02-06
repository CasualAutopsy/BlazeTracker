---
title: Procedural Weather
weight: 4
---

Weather in BlazeTracker isn't extracted from scene descriptions — it's **simulated**. This avoids burning LLM tokens on weather generation and ensures internal consistency across your story (if it was raining at 3pm, it should still be raining when you check back at 3:15pm).

## How It Works

The weather system has four stages:

### 1. Location Classification

When a new area is first encountered, the LLM classifies it:

- **Real location** — A place that exists in the real world (e.g., "Tokyo", "London"). Gets geocoded to real coordinates.
- **Fictional analog** — A fictional place with a real-world climate equivalent (e.g., "Winterfell" maps to Reykjavik, "Dorne" maps to southern Spain).
- **Base climate type** — A fictional place described by climate type (e.g., "temperate forest", "arctic tundra", "desert").

### 2. Climate Normals

For real locations, BlazeTracker fetches **historical climate data** from [Open-Meteo](https://open-meteo.com/) — monthly temperature ranges, precipitation patterns, humidity averages, and wind data.

For fictional locations with a real-world analog, it uses the analog's climate data.

For base climate types, it uses built-in **fallback climate profiles** that provide reasonable monthly normals for each climate category.

### 3. Forecast Generation

Using the climate normals, BlazeTracker generates a **28-day forecast** with hourly resolution. This uses a seeded random number generator:

- Daily high and low temperatures vary realistically around monthly norms
- Precipitation events cluster naturally (rainy days tend to follow rainy days)
- Wind patterns, humidity, and cloud cover correlate with conditions
- Sunrise and sunset times are calculated from latitude and time of year

The seed is deterministic based on the area name and start date, meaning the same location at the same time always produces the same forecast.

### 4. Hourly Lookup

When BlazeTracker needs the current weather (for display or injection), it looks up the exact hour in the forecast:

- **Temperature** — Interpolated from daily high/low based on time of day
- **Conditions** — Clear, cloudy, rain, snow, etc.
- **Humidity, wind, cloud cover** — From the hourly forecast
- **Daylight phase** — Dawn, day, dusk, or night based on sunrise/sunset

### Indoor Temperature

For indoor locations, temperature is adjusted based on building type:

| Location Type | Behavior |
|---------------|----------|
| `outdoor` | Actual outdoor temperature |
| `modern` | Climate-controlled (68-72°F / 20-22°C) |
| `heated` | Traditional heating (55-75°F / 13-24°C, varies with outdoor temp) |
| `unheated` | Shelter but no climate control (dampened outdoor temp) |
| `underground` | Stable temperature (~55°F / 13°C year-round) |
| `tent` | Minimal shelter (close to outdoor with slight dampening) |
| `vehicle` | Enclosed transport (similar to modern in moving vehicles) |

## When Forecasts Regenerate

A new forecast is generated when:

- **Area changes** — Moving to a new area triggers a forecast for that area
- **Time exceeds forecast range** — If narrative time advances past the 28-day window, a new forecast is generated starting from the current date

Forecasts are stored as events (`forecast_generated`) in the event store, so they persist across sessions and survive swipes/regeneration.

## Why Not LLM-Extracted Weather?

Three reasons:

1. **Consistency** — An LLM might say it's sunny in one extraction and raining in the next, even if only 5 minutes passed. Procedural weather is deterministic.
2. **Token efficiency** — Weather extraction would be an additional LLM call per message. Climate computation is instant and free.
3. **Richness** — The procedural system provides hourly resolution, 7-day forecasts, sunrise/sunset times, and UV index — more detail than an LLM would typically generate.
