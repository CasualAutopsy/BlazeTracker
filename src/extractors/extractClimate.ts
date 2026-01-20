import { getSettings } from '../settings';
import { getPrompt } from './prompts';
import { makeGeneratorRequest, buildExtractionMessages } from '../utils/generator';
import { parseJsonResponse, asNumber } from '../utils/json';
import type { NarrativeDateTime } from '../types/state';
import type { LocationState } from './extractLocation';

// ============================================
// Types
// ============================================

export type WeatherType = 'sunny' | 'cloudy' | 'snowy' | 'rainy' | 'windy' | 'thunderstorm';

export interface ClimateState {
	weather: WeatherType;
	temperature: number;
}

// ============================================
// Schema & Example
// ============================================

export const CLIMATE_SCHEMA = {
	type: 'object',
	description: 'Current climate/weather conditions',
	additionalProperties: false,
	properties: {
		weather: {
			type: 'string',
			enum: ['sunny', 'cloudy', 'snowy', 'rainy', 'windy', 'thunderstorm'],
			description:
				'The current weather in the locale (if characters are indoors, give the weather outdoors)',
		},
		temperature: {
			type: 'number',
			description:
				'Current temperature in Fahrenheit (if characters are indoors, give the indoor temperature)',
		},
	},
	required: ['weather', 'temperature'],
};

const CLIMATE_EXAMPLE = JSON.stringify(
	{
		weather: 'rainy',
		temperature: 52,
	},
	null,
	2,
);

// ============================================
// Constants
// ============================================

const SYSTEM_PROMPT =
	'You are a climate analysis agent for roleplay scenes. Return only valid JSON.';
const TEMPERATURE = 0.3;
const VALID_WEATHER: readonly WeatherType[] = [
	'sunny',
	'cloudy',
	'snowy',
	'rainy',
	'windy',
	'thunderstorm',
];

// ============================================
// Public API
// ============================================

export async function extractClimate(
	isInitial: boolean,
	messages: string,
	narrativeTime: NarrativeDateTime,
	location: LocationState,
	characterInfo: string,
	previousClimate: ClimateState | null,
	abortSignal?: AbortSignal,
): Promise<ClimateState> {
	const settings = getSettings();

	const timeStr = formatNarrativeTime(narrativeTime);
	const locationStr = `${location.area} - ${location.place} (${location.position})`;
	const schemaStr = JSON.stringify(CLIMATE_SCHEMA, null, 2);

	const prompt = isInitial
		? getPrompt('climate_initial')
			.replace('{{narrativeTime}}', timeStr)
			.replace('{{location}}', locationStr)
			.replace('{{characterInfo}}', characterInfo)
			.replace('{{messages}}', messages)
			.replace('{{schema}}', schemaStr)
			.replace('{{schemaExample}}', CLIMATE_EXAMPLE)
		: getPrompt('climate_update')
			.replace('{{narrativeTime}}', timeStr)
			.replace('{{location}}', locationStr)
			.replace(
				'{{previousState}}',
				JSON.stringify(previousClimate, null, 2),
			)
			.replace('{{messages}}', messages)
			.replace('{{schema}}', schemaStr)
			.replace('{{schemaExample}}', CLIMATE_EXAMPLE);

	const llmMessages = buildExtractionMessages(SYSTEM_PROMPT, prompt);

	const response = await makeGeneratorRequest(llmMessages, {
		profileId: settings.profileId,
		maxTokens: settings.maxResponseTokens,
		temperature: TEMPERATURE,
		abortSignal,
	});

	const parsed = parseJsonResponse(response, {
		shape: 'object',
		moduleName: 'BlazeTracker/Climate',
	});

	return validateClimate(parsed);
}

// ============================================
// Internal: Helpers
// ============================================

function formatNarrativeTime(time: NarrativeDateTime): string {
	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];

	const hour12 = time.hour % 12 || 12;
	const ampm = time.hour < 12 ? 'AM' : 'PM';
	const minuteStr = String(time.minute).padStart(2, '0');

	return `${time.dayOfWeek}, ${monthNames[time.month - 1]} ${time.day}, ${time.year} at ${hour12}:${minuteStr} ${ampm}`;
}

// ============================================
// Validation
// ============================================

function validateClimate(data: unknown): ClimateState {
	if (typeof data !== 'object' || data === null) {
		throw new Error('Invalid climate: expected object');
	}

	const obj = data as Record<string, unknown>;
	const weather = VALID_WEATHER.includes(obj.weather as WeatherType)
		? (obj.weather as WeatherType)
		: 'sunny';
	const temperature = asNumber(obj.temperature, 70);

	return { weather, temperature };
}
