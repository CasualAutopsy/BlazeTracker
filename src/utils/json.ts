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

// ============================================
// JSON Repair Functions
// ============================================

/**
 * Fix unquoted keys in JSON strings.
 * Converts: { footwear: null } -> { "footwear": null }
 */
function repairUnquotedKeys(jsonStr: string): string {
	// Match unquoted keys after { or , (with optional whitespace/newlines)
	// Captures: delimiter, key name, colon
	return jsonStr.replace(
		/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g,
		'$1"$2"$3',
	);
}

/**
 * Apply all repair functions to a JSON string.
 * Add new repair functions here as needed.
 */
function repairJson(jsonStr: string): string {
	let repaired = jsonStr;

	// Apply repairs in sequence
	repaired = repairUnquotedKeys(repaired);

	// Add more repairs here as needed:
	// repaired = repairTrailingCommas(repaired);
	// repaired = repairSingleQuotes(repaired);
	// etc.

	return repaired;
}

// ============================================
// Main Parser
// ============================================

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

	// Try parsing as-is first
	try {
		return JSON.parse(jsonStr) as T;
	} catch {
		// Try with repairs
		const repaired = repairJson(jsonStr);
		try {
			return JSON.parse(repaired) as T;
		} catch (e) {
			console.error(`[${moduleName}] Failed to parse response:`, e);
			console.error(`[${moduleName}] Original:`, jsonStr);
			console.error(`[${moduleName}] After repair:`, repaired);
			throw new Error(`Failed to parse ${moduleName} response as JSON`);
		}
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
