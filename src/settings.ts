import { ExtensionSettingsManager } from 'sillytavern-utils-lib';
import { EXTENSION_KEY } from './constants';

export interface CustomPrompts {
	[key: string]: string;
}

export interface CustomTemperatures {
	[key: string]: number;
}

export interface BlazeTrackerSettings {
	profileId: string;
	autoMode: 'none' | 'responses' | 'inputs' | 'both';
	lastXMessages: number;
	maxResponseTokens: number;
	displayPosition: 'above' | 'below';
	// Extraction toggles
	trackTime: boolean;
	trackLocation: boolean;
	trackClimate: boolean;
	trackCharacters: boolean;
	trackScene: boolean;
	// Other settings
	leapThresholdMinutes: number;
	temperatureUnit: 'fahrenheit' | 'celsius';
	timeFormat: '12h' | '24h';
	customPrompts: CustomPrompts;
	customTemperatures: CustomTemperatures;
}

export const defaultSettings: BlazeTrackerSettings = {
	profileId: '',
	autoMode: 'both',
	lastXMessages: 10,
	maxResponseTokens: 4000,
	displayPosition: 'below',
	// All extractions enabled by default
	trackTime: true,
	trackLocation: true,
	trackClimate: true,
	trackCharacters: true,
	trackScene: true,
	// Other defaults
	leapThresholdMinutes: 20,
	temperatureUnit: 'fahrenheit',
	timeFormat: '24h',
	customPrompts: {},
	customTemperatures: {},
};

// Default temperatures for each extractor prompt
export const defaultTemperatures: Record<string, number> = {
	time_datetime: 0.3,
	time_delta: 0.3,
	location_initial: 0.5,
	location_update: 0.5,
	climate_initial: 0.3,
	climate_update: 0.3,
	characters_initial: 0.7,
	characters_update: 0.7,
	scene_initial: 0.6,
	scene_update: 0.6,
};

/**
 * Get the temperature for a specific prompt key.
 * Returns custom temperature if set, otherwise the default.
 */
export function getTemperature(key: string): number {
	const settings = getSettings();
	if (key in settings.customTemperatures) {
		return settings.customTemperatures[key];
	}
	return defaultTemperatures[key] ?? 0.5;
}

export const settingsManager = new ExtensionSettingsManager<BlazeTrackerSettings>(
	EXTENSION_KEY,
	defaultSettings,
);

export function getSettings(): BlazeTrackerSettings {
	return settingsManager.getSettings();
}

export function updateSetting<K extends keyof BlazeTrackerSettings>(
	key: K,
	value: BlazeTrackerSettings[K],
): void {
	const settings = settingsManager.getSettings();
	settings[key] = value;
	settingsManager.saveSettings();
	console.log(`[BlazeTracker] Setting ${key} updated`);
}
