/**
 * Weather Deriver
 *
 * Derives human-readable weather conditions from meteorological metrics.
 * All temperatures in Fahrenheit, wind in mph, precipitation in inches.
 */

import type { HourlyWeather, WeatherCondition, DaylightPhase } from './types';

// ============================================
// Condition Derivation
// ============================================

/**
 * Derive weather condition from hourly metrics
 */
export function deriveCondition(weather: HourlyWeather): WeatherCondition {
	const { temperature, precipitation, humidity, windSpeed, cloudCover } = weather;

	// Precipitation takes priority (precipitation in inches)
	if (precipitation > 0.02) {
		// Snow vs rain (temperature in °F)
		if (temperature <= 32) {
			if (windSpeed > 25 && precipitation > 0.2) return 'blizzard';
			if (precipitation > 0.2) return 'heavy_snow';
			return 'snow';
		}
		if (temperature <= 35) return 'sleet';

		// Rain intensity
		if (precipitation > 0.4) return 'heavy_rain';
		if (precipitation > 0.2 && windSpeed > 20) return 'thunderstorm';
		if (precipitation > 0.08) return 'rain';
		return 'drizzle';
	}

	// Fog (high humidity, low wind, near dew point)
	if (humidity > 95 && windSpeed < 6 && cloudCover > 80) {
		return 'foggy';
	}

	// Wind (mph)
	if (windSpeed > 30) return 'windy';

	// Cloud cover
	if (cloudCover > 85) return 'overcast';
	if (cloudCover > 50) return 'partly_cloudy';

	// Temperature extremes (°F)
	if (temperature > 95) return 'hot';
	if (temperature < 14) return 'cold';

	// Humidity extreme
	if (humidity > 85 && temperature > 75) return 'humid';

	// Default clear conditions
	return cloudCover < 20 ? 'sunny' : 'clear';
}

// ============================================
// Condition Descriptions
// ============================================

const CONDITION_DESCRIPTIONS: Record<WeatherCondition, string[]> = {
	clear: ['clear skies', 'pleasant weather', 'calm conditions'],
	sunny: ['bright sunshine', 'sunny skies', 'brilliant sun'],
	partly_cloudy: ['scattered clouds', 'partly cloudy', 'intermittent sunshine'],
	overcast: ['gray skies', 'heavy cloud cover', 'overcast'],
	foggy: ['thick fog', 'misty conditions', 'fog rolling in'],
	drizzle: ['light drizzle', 'misting rain', 'gentle rain'],
	rain: ['steady rain', 'rainfall', 'rainy weather'],
	heavy_rain: ['heavy rain', 'downpour', 'torrential rain'],
	thunderstorm: ['thunderstorm', 'thunder and lightning', 'electrical storm'],
	sleet: ['freezing rain', 'sleet', 'icy precipitation'],
	snow: ['snowfall', 'snow flurries', 'snowing'],
	heavy_snow: ['heavy snowfall', 'blanketing snow', 'intense snow'],
	blizzard: ['blizzard conditions', 'whiteout', 'severe blizzard'],
	windy: ['strong winds', 'gusty conditions', 'blustery weather'],
	hot: ['scorching heat', 'oppressive heat', 'sweltering'],
	cold: ['bitter cold', 'freezing temperatures', 'frigid air'],
	humid: ['muggy conditions', 'humid air', 'sticky weather'],
};

/**
 * Night-specific descriptions for conditions that reference daylight.
 */
const CONDITION_DESCRIPTIONS_NIGHT: Partial<Record<WeatherCondition, string[]>> = {
	clear: ['clear night sky', 'starry skies', 'calm night'],
	sunny: ['clear night sky', 'starry skies', 'pleasant night'], // 'sunny' shouldn't occur at night, but handle gracefully
	partly_cloudy: ['scattered clouds', 'partly cloudy', 'patchy clouds'],
};

/**
 * Get a human-readable description of the condition
 */
export function describeCondition(
	condition: WeatherCondition,
	rng?: () => number,
	isNight?: boolean,
): string {
	// Use night descriptions for conditions that reference daylight
	const nightOptions = isNight ? CONDITION_DESCRIPTIONS_NIGHT[condition] : undefined;
	const options = nightOptions || CONDITION_DESCRIPTIONS[condition] || ['moderate weather'];
	const random = rng ? rng() : Math.random();
	return options[Math.floor(random * options.length)];
}

// ============================================
// Wind Direction
// ============================================

const WIND_DIRECTIONS = [
	'N',
	'NNE',
	'NE',
	'ENE',
	'E',
	'ESE',
	'SE',
	'SSE',
	'S',
	'SSW',
	'SW',
	'WSW',
	'W',
	'WNW',
	'NW',
	'NNW',
];

/**
 * Convert wind direction degrees to compass direction
 */
export function getWindDirection(degrees: number): string {
	const index = Math.round(degrees / 22.5) % 16;
	return WIND_DIRECTIONS[index];
}

// ============================================
// Daylight Phase
// ============================================

/**
 * Determine daylight phase based on current hour and sun times
 */
export function getDaylightPhase(hour: number, sunrise: number, sunset: number): DaylightPhase {
	// Dawn: 30 min before to 30 min after sunrise
	if (hour >= sunrise - 0.5 && hour < sunrise + 0.5) return 'dawn';

	// Day: after dawn until 30 min before sunset
	if (hour >= sunrise + 0.5 && hour < sunset - 0.5) return 'day';

	// Dusk: 30 min before to 30 min after sunset
	if (hour >= sunset - 0.5 && hour < sunset + 0.5) return 'dusk';

	// Night: everything else
	return 'night';
}

// ============================================
// Feels Like Temperature
// ============================================

/**
 * Calculate "feels like" temperature (wind chill / heat index)
 * Uses Fahrenheit
 */
export function calculateFeelsLike(
	temperature: number,
	humidity: number,
	windSpeed: number,
): number {
	// Wind chill (for cold temperatures)
	if (temperature <= 50 && windSpeed > 3) {
		// NWS Wind Chill formula
		const windChill =
			35.74 +
			0.6215 * temperature -
			35.75 * Math.pow(windSpeed, 0.16) +
			0.4275 * temperature * Math.pow(windSpeed, 0.16);
		return Math.round(windChill);
	}

	// Heat index (for hot temperatures)
	if (temperature >= 80 && humidity >= 40) {
		// Simplified Rothfusz regression
		const hi =
			-42.379 +
			2.04901523 * temperature +
			10.14333127 * humidity -
			0.22475541 * temperature * humidity -
			0.00683783 * temperature * temperature -
			0.05481717 * humidity * humidity +
			0.00122874 * temperature * temperature * humidity +
			0.00085282 * temperature * humidity * humidity -
			0.00000199 * temperature * temperature * humidity * humidity;

		return Math.round(hi);
	}

	// No adjustment needed
	return Math.round(temperature);
}

// ============================================
// Dominant Condition for Day
// ============================================

/**
 * Determine the dominant weather condition for a day
 * based on hourly conditions (weighted toward daytime hours)
 */
export function getDominantCondition(
	hourlyConditions: WeatherCondition[],
	sunrise: number,
	sunset: number,
): WeatherCondition {
	const counts: Record<string, number> = {};

	hourlyConditions.forEach((condition, hour) => {
		// Weight daytime hours more heavily
		const isDaytime = hour >= Math.floor(sunrise) && hour <= Math.ceil(sunset);
		const weight = isDaytime ? 2 : 1;

		counts[condition] = (counts[condition] || 0) + weight;
	});

	// Find condition with highest count
	let dominant: WeatherCondition = 'clear';
	let maxCount = 0;

	for (const [condition, count] of Object.entries(counts)) {
		if (count > maxCount) {
			maxCount = count;
			dominant = condition as WeatherCondition;
		}
	}

	return dominant;
}

// ============================================
// Legacy Condition Mapping
// ============================================

/**
 * Map legacy weather types to new WeatherCondition
 */
export function mapLegacyWeather(legacyWeather: string): WeatherCondition {
	const mapping: Record<string, WeatherCondition> = {
		sunny: 'sunny',
		cloudy: 'overcast',
		snowy: 'snow',
		rainy: 'rain',
		windy: 'windy',
		thunderstorm: 'thunderstorm',
	};

	return mapping[legacyWeather.toLowerCase()] || 'clear';
}

/**
 * Map new WeatherCondition back to legacy weather type (for display compatibility)
 */
export function toLegacyWeather(
	condition: WeatherCondition,
): 'sunny' | 'cloudy' | 'snowy' | 'rainy' | 'windy' | 'thunderstorm' {
	switch (condition) {
		case 'sunny':
		case 'clear':
		case 'hot':
			return 'sunny';

		case 'partly_cloudy':
		case 'overcast':
		case 'foggy':
		case 'humid':
			return 'cloudy';

		case 'snow':
		case 'heavy_snow':
		case 'blizzard':
		case 'sleet':
		case 'cold':
			return 'snowy';

		case 'drizzle':
		case 'rain':
		case 'heavy_rain':
			return 'rainy';

		case 'windy':
			return 'windy';

		case 'thunderstorm':
			return 'thunderstorm';

		default:
			return 'sunny';
	}
}
