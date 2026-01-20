export type TemperatureUnit = 'fahrenheit' | 'celsius';

export function fahrenheitToCelsius(fahrenheit: number): number {
	return Math.round(((fahrenheit - 32) * 5) / 9);
}

export function celsiusToFahrenheit(celsius: number): number {
	return Math.round((celsius * 9) / 5 + 32);
}

/**
 * Convert from storage (Fahrenheit) to display unit
 */
export function toDisplayTemp(fahrenheit: number, unit: TemperatureUnit): number {
	return unit === 'celsius' ? fahrenheitToCelsius(fahrenheit) : fahrenheit;
}

/**
 * Convert from display unit to storage (Fahrenheit)
 */
export function toStorageTemp(display: number, unit: TemperatureUnit): number {
	return unit === 'celsius' ? celsiusToFahrenheit(display) : display;
}

/**
 * Format temperature for display with unit symbol
 */
export function formatTemperature(fahrenheit: number, unit: TemperatureUnit): string {
	if (unit === 'celsius') {
		return `${fahrenheitToCelsius(fahrenheit)}°C`;
	}
	return `${fahrenheit}°F`;
}
