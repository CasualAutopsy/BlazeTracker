import { describe, it, expect } from 'vitest';
import {
	fahrenheitToCelsius,
	celsiusToFahrenheit,
	toDisplayTemp,
	toStorageTemp,
	formatTemperature,
} from './temperatures';

describe('fahrenheitToCelsius', () => {
	it('converts freezing point', () => {
		expect(fahrenheitToCelsius(32)).toBe(0);
	});

	it('converts boiling point', () => {
		expect(fahrenheitToCelsius(212)).toBe(100);
	});

	it('converts room temperature', () => {
		expect(fahrenheitToCelsius(68)).toBe(20);
	});

	it('converts body temperature', () => {
		expect(fahrenheitToCelsius(98.6)).toBe(37);
	});

	it('converts negative temperatures', () => {
		expect(fahrenheitToCelsius(-40)).toBe(-40); // Same in both scales
	});

	it('converts cold temperature', () => {
		expect(fahrenheitToCelsius(14)).toBe(-10);
	});

	it('rounds to nearest integer', () => {
		expect(fahrenheitToCelsius(70)).toBe(21); // 21.11... -> 21
	});
});

describe('celsiusToFahrenheit', () => {
	it('converts freezing point', () => {
		expect(celsiusToFahrenheit(0)).toBe(32);
	});

	it('converts boiling point', () => {
		expect(celsiusToFahrenheit(100)).toBe(212);
	});

	it('converts room temperature', () => {
		expect(celsiusToFahrenheit(20)).toBe(68);
	});

	it('converts body temperature', () => {
		expect(celsiusToFahrenheit(37)).toBe(99); // Rounded from 98.6
	});

	it('converts negative temperatures', () => {
		expect(celsiusToFahrenheit(-40)).toBe(-40); // Same in both scales
	});

	it('converts cold temperature', () => {
		expect(celsiusToFahrenheit(-10)).toBe(14);
	});

	it('rounds to nearest integer', () => {
		expect(celsiusToFahrenheit(21)).toBe(70); // 69.8 -> 70
	});
});

describe('toDisplayTemp', () => {
	it('returns fahrenheit unchanged when unit is fahrenheit', () => {
		expect(toDisplayTemp(72, 'fahrenheit')).toBe(72);
	});

	it('converts to celsius when unit is celsius', () => {
		expect(toDisplayTemp(72, 'celsius')).toBe(22);
	});

	it('handles freezing point for celsius', () => {
		expect(toDisplayTemp(32, 'celsius')).toBe(0);
	});

	it('handles freezing point for fahrenheit', () => {
		expect(toDisplayTemp(32, 'fahrenheit')).toBe(32);
	});
});

describe('toStorageTemp', () => {
	it('returns fahrenheit unchanged when unit is fahrenheit', () => {
		expect(toStorageTemp(72, 'fahrenheit')).toBe(72);
	});

	it('converts from celsius when unit is celsius', () => {
		expect(toStorageTemp(22, 'celsius')).toBe(72);
	});

	it('handles freezing point from celsius', () => {
		expect(toStorageTemp(0, 'celsius')).toBe(32);
	});

	it('handles freezing point from fahrenheit', () => {
		expect(toStorageTemp(32, 'fahrenheit')).toBe(32);
	});
});

describe('formatTemperature', () => {
	it('formats fahrenheit with °F symbol', () => {
		expect(formatTemperature(72, 'fahrenheit')).toBe('72°F');
	});

	it('formats celsius with °C symbol', () => {
		expect(formatTemperature(72, 'celsius')).toBe('22°C');
	});

	it('formats freezing point in fahrenheit', () => {
		expect(formatTemperature(32, 'fahrenheit')).toBe('32°F');
	});

	it('formats freezing point in celsius', () => {
		expect(formatTemperature(32, 'celsius')).toBe('0°C');
	});

	it('formats negative fahrenheit', () => {
		expect(formatTemperature(-4, 'fahrenheit')).toBe('-4°F');
	});

	it('formats negative celsius', () => {
		expect(formatTemperature(14, 'celsius')).toBe('-10°C');
	});
});

describe('round-trip conversions', () => {
	it('fahrenheit -> celsius -> fahrenheit is consistent', () => {
		const original = 72;
		const celsius = fahrenheitToCelsius(original);
		const backToF = celsiusToFahrenheit(celsius);
		// May lose precision due to rounding, but should be close
		expect(Math.abs(backToF - original)).toBeLessThanOrEqual(1);
	});

	it('celsius -> fahrenheit -> celsius is consistent', () => {
		const original = 22;
		const fahrenheit = celsiusToFahrenheit(original);
		const backToC = fahrenheitToCelsius(fahrenheit);
		expect(Math.abs(backToC - original)).toBeLessThanOrEqual(1);
	});

	it('toDisplayTemp and toStorageTemp are inverses for fahrenheit', () => {
		const original = 72;
		const display = toDisplayTemp(original, 'fahrenheit');
		const storage = toStorageTemp(display, 'fahrenheit');
		expect(storage).toBe(original);
	});

	it('toDisplayTemp and toStorageTemp are inverses for celsius', () => {
		const original = 72;
		const display = toDisplayTemp(original, 'celsius');
		const storage = toStorageTemp(display, 'celsius');
		expect(Math.abs(storage - original)).toBeLessThanOrEqual(1);
	});
});
