import { describe, it, expect } from 'vitest';
import {
	deriveCondition,
	describeCondition,
	getWindDirection,
	getDaylightPhase,
	calculateFeelsLike,
	getDominantCondition,
	mapLegacyWeather,
	toLegacyWeather,
} from './weatherDeriver';
import type { HourlyWeather, WeatherCondition } from './types';

// ============================================
// deriveCondition
// ============================================

describe('deriveCondition', () => {
	const baseWeather: HourlyWeather = {
		hour: 12,
		temperature: 70,
		feelsLike: 70,
		humidity: 50,
		windSpeed: 10,
		windDirection: 180,
		precipitation: 0,
		precipProbability: 0,
		cloudCover: 30,
		uvIndex: 5,
	};

	describe('precipitation conditions', () => {
		it('returns rain for moderate precipitation above freezing', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				precipitation: 0.1,
				temperature: 50,
			};
			expect(deriveCondition(weather)).toBe('rain');
		});

		it('returns drizzle for light precipitation', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				precipitation: 0.03,
				temperature: 50,
			};
			expect(deriveCondition(weather)).toBe('drizzle');
		});

		it('returns heavy_rain for heavy precipitation', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				precipitation: 0.5,
				temperature: 60,
			};
			expect(deriveCondition(weather)).toBe('heavy_rain');
		});

		it('returns thunderstorm for moderate precip with high wind', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				precipitation: 0.25,
				windSpeed: 25,
				temperature: 70,
			};
			expect(deriveCondition(weather)).toBe('thunderstorm');
		});

		it('returns snow at or below freezing', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				precipitation: 0.1,
				temperature: 32,
			};
			expect(deriveCondition(weather)).toBe('snow');
		});

		it('returns heavy_snow for heavy precipitation below freezing', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				precipitation: 0.25,
				temperature: 28,
			};
			expect(deriveCondition(weather)).toBe('heavy_snow');
		});

		it('returns blizzard for heavy snow with high wind', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				precipitation: 0.25,
				temperature: 25,
				windSpeed: 30,
			};
			expect(deriveCondition(weather)).toBe('blizzard');
		});

		it('returns sleet for temperatures between 32-35°F', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				precipitation: 0.1,
				temperature: 34,
			};
			expect(deriveCondition(weather)).toBe('sleet');
		});
	});

	describe('fog conditions', () => {
		it('returns foggy for high humidity, low wind, high clouds', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				humidity: 97,
				windSpeed: 3,
				cloudCover: 90,
				precipitation: 0,
			};
			expect(deriveCondition(weather)).toBe('foggy');
		});

		it('does not return foggy if wind is too high', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				humidity: 97,
				windSpeed: 10,
				cloudCover: 90,
				precipitation: 0,
			};
			expect(deriveCondition(weather)).not.toBe('foggy');
		});
	});

	describe('wind conditions', () => {
		it('returns windy for very high wind speed', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				windSpeed: 35,
				cloudCover: 20,
			};
			expect(deriveCondition(weather)).toBe('windy');
		});
	});

	describe('cloud cover conditions', () => {
		it('returns overcast for high cloud cover', () => {
			const weather: HourlyWeather = { ...baseWeather, cloudCover: 90 };
			expect(deriveCondition(weather)).toBe('overcast');
		});

		it('returns partly_cloudy for moderate cloud cover', () => {
			const weather: HourlyWeather = { ...baseWeather, cloudCover: 60 };
			expect(deriveCondition(weather)).toBe('partly_cloudy');
		});
	});

	describe('temperature extremes', () => {
		it('returns hot for very high temperatures', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				temperature: 100,
				cloudCover: 10,
			};
			expect(deriveCondition(weather)).toBe('hot');
		});

		it('returns cold for very low temperatures', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				temperature: 10,
				cloudCover: 10,
			};
			expect(deriveCondition(weather)).toBe('cold');
		});
	});

	describe('humidity', () => {
		it('returns humid for high humidity and warm temperature', () => {
			const weather: HourlyWeather = {
				...baseWeather,
				humidity: 90,
				temperature: 80,
				cloudCover: 30,
			};
			expect(deriveCondition(weather)).toBe('humid');
		});
	});

	describe('clear conditions', () => {
		it('returns sunny for low cloud cover', () => {
			const weather: HourlyWeather = { ...baseWeather, cloudCover: 10 };
			expect(deriveCondition(weather)).toBe('sunny');
		});

		it('returns clear for moderate-low cloud cover', () => {
			const weather: HourlyWeather = { ...baseWeather, cloudCover: 25 };
			expect(deriveCondition(weather)).toBe('clear');
		});
	});
});

// ============================================
// describeCondition
// ============================================

describe('describeCondition', () => {
	it('returns a description from the available options', () => {
		const description = describeCondition('sunny');
		expect(['bright sunshine', 'sunny skies', 'brilliant sun']).toContain(description);
	});

	it('uses provided RNG for deterministic selection', () => {
		// RNG returning 0 should pick first option
		const desc1 = describeCondition('sunny', () => 0);
		expect(desc1).toBe('bright sunshine');

		// RNG returning 0.99 should pick last option
		const desc2 = describeCondition('sunny', () => 0.99);
		expect(desc2).toBe('brilliant sun');
	});

	it('returns description for all condition types', () => {
		const conditions: WeatherCondition[] = [
			'clear',
			'sunny',
			'partly_cloudy',
			'overcast',
			'foggy',
			'drizzle',
			'rain',
			'heavy_rain',
			'thunderstorm',
			'sleet',
			'snow',
			'heavy_snow',
			'blizzard',
			'windy',
			'hot',
			'cold',
			'humid',
		];

		for (const condition of conditions) {
			const desc = describeCondition(condition);
			expect(desc).toBeTruthy();
			expect(typeof desc).toBe('string');
		}
	});

	describe('night descriptions', () => {
		it('uses night descriptions for clear at night', () => {
			const description = describeCondition('clear', () => 0, true);
			expect(description).toBe('clear night sky');
		});

		it('uses night descriptions for sunny at night', () => {
			// 'sunny' shouldn't occur at night but should be handled gracefully
			const description = describeCondition('sunny', () => 0, true);
			expect(description).toBe('clear night sky');
		});

		it('uses night descriptions for partly_cloudy at night', () => {
			const description = describeCondition('partly_cloudy', () => 0, true);
			expect(description).toBe('scattered clouds');
		});

		it('avoids sunshine references for partly_cloudy at night', () => {
			// Check all options don't contain "sunshine"
			for (let i = 0; i < 3; i++) {
				const rng = () => i / 3;
				const description = describeCondition('partly_cloudy', rng, true);
				expect(description).not.toContain('sunshine');
			}
		});

		it('uses day descriptions when isNight is false', () => {
			const description = describeCondition('sunny', () => 0, false);
			expect(description).toBe('bright sunshine');
		});

		it('uses day descriptions when isNight is undefined', () => {
			const description = describeCondition('sunny', () => 0);
			expect(description).toBe('bright sunshine');
		});

		it('falls back to day descriptions for conditions without night variants', () => {
			// 'rain' has no night-specific descriptions
			const description = describeCondition('rain', () => 0, true);
			expect(description).toBe('steady rain');
		});
	});
});

// ============================================
// getWindDirection
// ============================================

describe('getWindDirection', () => {
	it('returns N for 0 degrees', () => {
		expect(getWindDirection(0)).toBe('N');
	});

	it('returns N for 360 degrees', () => {
		expect(getWindDirection(360)).toBe('N');
	});

	it('returns E for 90 degrees', () => {
		expect(getWindDirection(90)).toBe('E');
	});

	it('returns S for 180 degrees', () => {
		expect(getWindDirection(180)).toBe('S');
	});

	it('returns W for 270 degrees', () => {
		expect(getWindDirection(270)).toBe('W');
	});

	it('returns NE for 45 degrees', () => {
		expect(getWindDirection(45)).toBe('NE');
	});

	it('returns SE for 135 degrees', () => {
		expect(getWindDirection(135)).toBe('SE');
	});

	it('returns SW for 225 degrees', () => {
		expect(getWindDirection(225)).toBe('SW');
	});

	it('returns NW for 315 degrees', () => {
		expect(getWindDirection(315)).toBe('NW');
	});
});

// ============================================
// getDaylightPhase
// ============================================

describe('getDaylightPhase', () => {
	const sunrise = 6; // 6 AM
	const sunset = 18; // 6 PM

	it('returns dawn around sunrise', () => {
		expect(getDaylightPhase(5.6, sunrise, sunset)).toBe('dawn');
		expect(getDaylightPhase(6, sunrise, sunset)).toBe('dawn');
		expect(getDaylightPhase(6.4, sunrise, sunset)).toBe('dawn');
	});

	it('returns day during daytime hours', () => {
		expect(getDaylightPhase(10, sunrise, sunset)).toBe('day');
		expect(getDaylightPhase(12, sunrise, sunset)).toBe('day');
		expect(getDaylightPhase(15, sunrise, sunset)).toBe('day');
	});

	it('returns dusk around sunset', () => {
		expect(getDaylightPhase(17.6, sunrise, sunset)).toBe('dusk');
		expect(getDaylightPhase(18, sunrise, sunset)).toBe('dusk');
		expect(getDaylightPhase(18.4, sunrise, sunset)).toBe('dusk');
	});

	it('returns night during nighttime hours', () => {
		expect(getDaylightPhase(0, sunrise, sunset)).toBe('night');
		expect(getDaylightPhase(3, sunrise, sunset)).toBe('night');
		expect(getDaylightPhase(22, sunrise, sunset)).toBe('night');
	});
});

// ============================================
// calculateFeelsLike
// ============================================

describe('calculateFeelsLike', () => {
	describe('wind chill', () => {
		it('applies wind chill for cold temperatures with wind', () => {
			const feelsLike = calculateFeelsLike(30, 50, 15);
			expect(feelsLike).toBeLessThan(30);
		});

		it('returns lower feels-like with higher wind', () => {
			const lowWind = calculateFeelsLike(30, 50, 10);
			const highWind = calculateFeelsLike(30, 50, 25);
			expect(highWind).toBeLessThan(lowWind);
		});

		it('does not apply wind chill if wind is low', () => {
			const feelsLike = calculateFeelsLike(40, 50, 2);
			expect(feelsLike).toBe(40);
		});
	});

	describe('heat index', () => {
		it('applies heat index for hot temperatures with humidity', () => {
			const feelsLike = calculateFeelsLike(90, 70, 5);
			expect(feelsLike).toBeGreaterThan(90);
		});

		it('returns higher feels-like with higher humidity', () => {
			const lowHumidity = calculateFeelsLike(90, 50, 5);
			const highHumidity = calculateFeelsLike(90, 80, 5);
			expect(highHumidity).toBeGreaterThan(lowHumidity);
		});

		it('does not apply heat index if humidity is low', () => {
			const feelsLike = calculateFeelsLike(85, 30, 5);
			expect(feelsLike).toBe(85);
		});
	});

	describe('no adjustment', () => {
		it('returns temperature unchanged for moderate conditions', () => {
			const feelsLike = calculateFeelsLike(70, 50, 10);
			expect(feelsLike).toBe(70);
		});
	});
});

// ============================================
// getDominantCondition
// ============================================

describe('getDominantCondition', () => {
	const sunrise = 6;
	const sunset = 18;

	it('returns most common condition', () => {
		const conditions: WeatherCondition[] = Array(24).fill('sunny');
		expect(getDominantCondition(conditions, sunrise, sunset)).toBe('sunny');
	});

	it('weights daytime hours more heavily', () => {
		// 6 night hours of rain (6 weight), 6 day hours of sunny (12 weight)
		const conditions: WeatherCondition[] = [];
		for (let i = 0; i < 24; i++) {
			if (i >= 6 && i <= 18) {
				conditions.push('sunny');
			} else {
				conditions.push('rain');
			}
		}
		expect(getDominantCondition(conditions, sunrise, sunset)).toBe('sunny');
	});

	it('handles tie-breaking by order of encounter', () => {
		const conditions: WeatherCondition[] = [];
		// Equal weighted occurrence
		for (let i = 0; i < 12; i++) {
			conditions.push('clear');
		}
		for (let i = 0; i < 12; i++) {
			conditions.push('sunny');
		}
		// First one encountered with max count wins
		const result = getDominantCondition(conditions, sunrise, sunset);
		expect(['clear', 'sunny']).toContain(result);
	});
});

// ============================================
// mapLegacyWeather
// ============================================

describe('mapLegacyWeather', () => {
	it('maps sunny to sunny', () => {
		expect(mapLegacyWeather('sunny')).toBe('sunny');
	});

	it('maps cloudy to overcast', () => {
		expect(mapLegacyWeather('cloudy')).toBe('overcast');
	});

	it('maps snowy to snow', () => {
		expect(mapLegacyWeather('snowy')).toBe('snow');
	});

	it('maps rainy to rain', () => {
		expect(mapLegacyWeather('rainy')).toBe('rain');
	});

	it('maps windy to windy', () => {
		expect(mapLegacyWeather('windy')).toBe('windy');
	});

	it('maps thunderstorm to thunderstorm', () => {
		expect(mapLegacyWeather('thunderstorm')).toBe('thunderstorm');
	});

	it('returns clear for unknown legacy types', () => {
		expect(mapLegacyWeather('unknown')).toBe('clear');
	});

	it('is case insensitive', () => {
		expect(mapLegacyWeather('SUNNY')).toBe('sunny');
		expect(mapLegacyWeather('Cloudy')).toBe('overcast');
	});
});

// ============================================
// toLegacyWeather
// ============================================

describe('toLegacyWeather', () => {
	it('maps sunny/clear/hot to sunny', () => {
		expect(toLegacyWeather('sunny')).toBe('sunny');
		expect(toLegacyWeather('clear')).toBe('sunny');
		expect(toLegacyWeather('hot')).toBe('sunny');
	});

	it('maps cloud/fog/humid conditions to cloudy', () => {
		expect(toLegacyWeather('partly_cloudy')).toBe('cloudy');
		expect(toLegacyWeather('overcast')).toBe('cloudy');
		expect(toLegacyWeather('foggy')).toBe('cloudy');
		expect(toLegacyWeather('humid')).toBe('cloudy');
	});

	it('maps snow/winter conditions to snowy', () => {
		expect(toLegacyWeather('snow')).toBe('snowy');
		expect(toLegacyWeather('heavy_snow')).toBe('snowy');
		expect(toLegacyWeather('blizzard')).toBe('snowy');
		expect(toLegacyWeather('sleet')).toBe('snowy');
		expect(toLegacyWeather('cold')).toBe('snowy');
	});

	it('maps rain conditions to rainy', () => {
		expect(toLegacyWeather('drizzle')).toBe('rainy');
		expect(toLegacyWeather('rain')).toBe('rainy');
		expect(toLegacyWeather('heavy_rain')).toBe('rainy');
	});

	it('maps windy to windy', () => {
		expect(toLegacyWeather('windy')).toBe('windy');
	});

	it('maps thunderstorm to thunderstorm', () => {
		expect(toLegacyWeather('thunderstorm')).toBe('thunderstorm');
	});
});
