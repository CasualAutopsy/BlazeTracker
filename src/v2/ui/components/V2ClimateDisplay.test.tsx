/**
 * Tests for V2ClimateDisplay component.
 */

import { describe, it, expect } from 'vitest';
import type { ClimateForecast, WeatherCondition } from '../../types/common';
import { getConditionIconDayNight } from '../icons';

/**
 * Create a mock climate forecast with sensible defaults.
 */
function createMockClimate(overrides: Partial<ClimateForecast> = {}): ClimateForecast {
	return {
		temperature: 72,
		outdoorTemperature: 72,
		feelsLike: 72,
		humidity: 50,
		precipitation: 0,
		cloudCover: 30,
		windSpeed: 5,
		windDirection: 'NW',
		conditions: 'clear',
		conditionType: 'clear',
		uvIndex: 5,
		daylight: 'day',
		isIndoors: false,
		...overrides,
	};
}

describe('V2ClimateDisplay day/night icon selection', () => {
	describe('clear weather icons', () => {
		it('shows sun icon for clear weather during day', () => {
			const climate = createMockClimate({
				conditionType: 'clear',
				daylight: 'day',
			});
			const isNight = climate.daylight === 'night' || climate.daylight === 'dusk';
			const icon = getConditionIconDayNight(climate.conditionType, isNight);
			expect(icon).toBe('fa-sun');
		});

		it('shows moon icon for clear weather at night', () => {
			const climate = createMockClimate({
				conditionType: 'clear',
				daylight: 'night',
			});
			const isNight = climate.daylight === 'night' || climate.daylight === 'dusk';
			const icon = getConditionIconDayNight(climate.conditionType, isNight);
			expect(icon).toBe('fa-moon');
		});

		it('shows moon icon for clear weather at dusk', () => {
			const climate = createMockClimate({
				conditionType: 'clear',
				daylight: 'dusk',
			});
			const isNight = climate.daylight === 'night' || climate.daylight === 'dusk';
			const icon = getConditionIconDayNight(climate.conditionType, isNight);
			expect(icon).toBe('fa-moon');
		});

		it('shows sun icon for clear weather at dawn', () => {
			const climate = createMockClimate({
				conditionType: 'clear',
				daylight: 'dawn',
			});
			const isNight = climate.daylight === 'night' || climate.daylight === 'dusk';
			const icon = getConditionIconDayNight(climate.conditionType, isNight);
			expect(icon).toBe('fa-sun');
		});
	});

	describe('partly cloudy icons', () => {
		it('shows cloud-sun for partly cloudy during day', () => {
			const climate = createMockClimate({
				conditionType: 'partly_cloudy',
				daylight: 'day',
			});
			const isNight = climate.daylight === 'night' || climate.daylight === 'dusk';
			const icon = getConditionIconDayNight(climate.conditionType, isNight);
			expect(icon).toBe('fa-cloud-sun');
		});

		it('shows cloud-moon for partly cloudy at night', () => {
			const climate = createMockClimate({
				conditionType: 'partly_cloudy',
				daylight: 'night',
			});
			const isNight = climate.daylight === 'night' || climate.daylight === 'dusk';
			const icon = getConditionIconDayNight(climate.conditionType, isNight);
			expect(icon).toBe('fa-cloud-moon');
		});
	});

	describe('drizzle icons', () => {
		it('shows cloud-rain for drizzle during day', () => {
			const climate = createMockClimate({
				conditionType: 'drizzle',
				daylight: 'day',
			});
			const isNight = climate.daylight === 'night' || climate.daylight === 'dusk';
			const icon = getConditionIconDayNight(climate.conditionType, isNight);
			expect(icon).toBe('fa-cloud-rain');
		});

		it('shows cloud-moon-rain for drizzle at night', () => {
			const climate = createMockClimate({
				conditionType: 'drizzle',
				daylight: 'night',
			});
			const isNight = climate.daylight === 'night' || climate.daylight === 'dusk';
			const icon = getConditionIconDayNight(climate.conditionType, isNight);
			expect(icon).toBe('fa-cloud-moon-rain');
		});
	});

	describe('weather icons unaffected by time', () => {
		const weatherTypes: WeatherCondition[] = [
			'overcast',
			'foggy',
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

		it.each(weatherTypes)('shows same icon for %s during day and night', condition => {
			const dayClimate = createMockClimate({
				conditionType: condition,
				daylight: 'day',
			});
			const nightClimate = createMockClimate({
				conditionType: condition,
				daylight: 'night',
			});

			const isNightDay =
				dayClimate.daylight === 'night' || dayClimate.daylight === 'dusk';
			const isNightNight =
				nightClimate.daylight === 'night' ||
				nightClimate.daylight === 'dusk';

			const dayIcon = getConditionIconDayNight(
				dayClimate.conditionType,
				isNightDay,
			);
			const nightIcon = getConditionIconDayNight(
				nightClimate.conditionType,
				isNightNight,
			);

			expect(dayIcon).toBe(nightIcon);
		});
	});
});
