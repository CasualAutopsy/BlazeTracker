/**
 * Expected shape of the JSON response.
 * 'object' will match {...}
 * 'array' will match [...]
 * 'auto' will try object first, then array
 */
export type JsonShape = 'object' | 'array' | 'auto';

export interface ParseOptions {
	/** Expected shape of the response */
	shape?: JsonShape;
	/** Module name for error logging */
	moduleName?: string;
}

/**
 * Parse a JSON response from an LLM, handling markdown code blocks
 * and extracting the JSON object or array.
 */
export function parseJsonResponse<T = unknown>(response: string, options: ParseOptions = {}): T {
	const { shape = 'auto', moduleName = 'BlazeTracker' } = options;

	let jsonStr = response.trim();

	// Strip markdown code blocks
	const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (jsonMatch) {
		jsonStr = jsonMatch[1].trim();
	}

	// Extract based on expected shape
	if (shape === 'array') {
		const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
		if (arrayMatch) {
			jsonStr = arrayMatch[0];
		}
	} else if (shape === 'object') {
		const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
		if (objectMatch) {
			jsonStr = objectMatch[0];
		}
	} else {
		// Auto: try object first, then array
		const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
		const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);

		if (objectMatch && arrayMatch) {
			// Use whichever comes first in the string
			jsonStr =
				jsonStr.indexOf('{') < jsonStr.indexOf('[')
					? objectMatch[0]
					: arrayMatch[0];
		} else if (objectMatch) {
			jsonStr = objectMatch[0];
		} else if (arrayMatch) {
			jsonStr = arrayMatch[0];
		}
	}

	try {
		return JSON.parse(jsonStr) as T;
	} catch (e) {
		console.error(`[${moduleName}] Failed to parse response:`, e);
		console.error(`[${moduleName}] Response was:`, response);
		throw new Error(`Failed to parse ${moduleName} response as JSON`);
	}
}

/**
 * Safely extract a string from an unknown value.
 */
export function asString(value: unknown, fallback: string): string {
	return typeof value === 'string' ? value : fallback;
}

/**
 * Safely extract a string or null from an unknown value.
 */
export function asStringOrNull(value: unknown): string | null {
	return typeof value === 'string' ? value : null;
}

/**
 * Safely extract a number from an unknown value.
 */
export function asNumber(value: unknown, fallback: number): number {
	return typeof value === 'number' ? value : fallback;
}

/**
 * Safely extract an array of strings from an unknown value.
 */
export function asStringArray(value: unknown, maxItems?: number): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const filtered = value.filter((v): v is string => typeof v === 'string');
	return maxItems ? filtered.slice(0, maxItems) : filtered;
}

/**
 * Check if value is a non-null object.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
