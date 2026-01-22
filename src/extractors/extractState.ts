import type { STContext } from '../types/st';
import type { TrackedState, NarrativeDateTime, Scene, Character } from '../types/state';
import { getSettings } from '../settings';
import { getMessageState } from '../utils/messageState';

// Import extractors
import { extractTime, setTimeTrackerState } from './extractTime';
import { extractLocation, type LocationState } from './extractLocation';
import { extractClimate } from './extractClimate';
import { extractCharacters } from './extractCharacters';
import { extractScene, shouldExtractScene } from './extractScene';
import { propAlreadyExists } from '../utils/clothingMatch';
import { setExtractionStep, setEnabledSteps } from './extractionProgress';

// ============================================
// Module State
// ============================================

let currentAbortController: AbortController | null = null;
let extractionCount = 0;
let generationWasStopped = false;

// ============================================
// Types
// ============================================

export interface ExtractionResult {
	state: TrackedState;
	raw: Record<string, string>;
}

export interface ExtractionOptions {
	forceSceneExtraction?: boolean;
}

// ============================================
// Send Button State Management
// ============================================

function setSendButtonState(isGenerating: boolean): void {
	const context = SillyTavern.getContext();
	if (isGenerating) {
		context.deactivateSendButtons();
	} else {
		context.activateSendButtons();
	}
}

// ============================================
// Abort Handling
// ============================================

export function setupExtractionAbortHandler(): void {
	const context = SillyTavern.getContext();

	context.eventSource.on(context.event_types.GENERATION_STOPPED, (() => {
		generationWasStopped = true;
		if (currentAbortController) {
			console.warn('[BlazeTracker] Generation stopped, aborting extraction');
			currentAbortController.abort();
			currentAbortController = null;
		}
	}) as (...args: unknown[]) => void);
}

/**
 * Check if the last generation was stopped/aborted by the user.
 * Returns the flag value and resets it to false.
 */
export function wasGenerationAborted(): boolean {
	const wasStopped = generationWasStopped;
	generationWasStopped = false;
	return wasStopped;
}

export function abortCurrentExtraction(): void {
	if (currentAbortController) {
		currentAbortController.abort();
		currentAbortController = null;
	}
}

// ============================================
// Default Values (for when extraction is disabled)
// ============================================

function getDefaultTime(): NarrativeDateTime {
	return {
		year: new Date().getFullYear(),
		month: 6,
		day: 15,
		hour: 12,
		minute: 0,
		second: 0,
		dayOfWeek: 'Monday',
	};
}

function getDefaultLocation(): LocationState {
	return {
		area: 'Unknown Area',
		place: 'Unknown Place',
		position: 'Main area',
		props: [],
	};
}

function getDefaultClimate() {
	return {
		weather: 'sunny' as const,
		temperature: 70,
	};
}

function getDefaultCharacters(): Character[] {
	return [];
}

function getDefaultScene(): Scene {
	return {
		topic: 'Scene in progress',
		tone: 'neutral',
		tension: {
			level: 'relaxed',
			direction: 'stable',
			type: 'conversation',
		},
		recentEvents: ['Scene in progress'],
	};
}

// ============================================
// Main Extraction Orchestrator
// ============================================

export async function extractState(
	context: STContext,
	messageId: number,
	previousState: TrackedState | null,
	abortSignal?: AbortSignal,
	options: ExtractionOptions = {},
): Promise<ExtractionResult> {
	const settings = getSettings();

	if (!settings.profileId) {
		throw new Error(
			'No connection profile selected. Please configure BlazeTracker in extension settings.',
		);
	}

	// Create and register abort controller
	const abortController = new AbortController();
	currentAbortController = abortController;

	// Link external abort signal if provided
	if (abortSignal) {
		abortSignal.addEventListener('abort', () => abortController.abort());
	}

	// Track active extractions for button state
	extractionCount++;
	if (extractionCount === 1) {
		setSendButtonState(true);
	}

	const rawResponses: Record<string, string> = {};

	try {
		const { lastXMessages } = settings;
		const isInitial = previousState === null;

		// Determine if this is an assistant message (for scene extraction)
		const currentMessage = context.chat[messageId];
		const isAssistantMessage = currentMessage?.is_user === false;
		const shouldRunScene =
			settings.trackScene !== false &&
			(options.forceSceneExtraction ||
				shouldExtractScene(messageId, isAssistantMessage));

		// Configure enabled steps for progress display
		setEnabledSteps({
			time: settings.trackTime !== false,
			location: settings.trackLocation !== false,
			climate: settings.trackClimate !== false,
			characters: settings.trackCharacters !== false,
			scene: shouldRunScene,
		});

		// ========================================
		// STEP 0: Initialize time tracker from previous state
		// ========================================
		if (previousState?.time) {
			setTimeTrackerState(previousState.time);
		}

		// ========================================
		// Get message window for extraction
		// ========================================
		const { formattedMessages, characterInfo, userInfo } = prepareExtractionContext(
			context,
			messageId,
			lastXMessages,
			previousState,
		);

		// ========================================
		// STEP 1: Extract Time (if enabled)
		// ========================================
		let narrativeTime: NarrativeDateTime | undefined;

		if (settings.trackTime !== false) {
			setExtractionStep('time');

			narrativeTime = await extractTime(
				!isInitial,
				formattedMessages,
				abortController.signal,
			);
		} else {
			// Use previous or default (undefined means not tracked)
			narrativeTime = previousState?.time;
		}

		// ========================================
		// STEP 2: Extract Location (if enabled)
		// ========================================
		let location: LocationState | undefined;

		if (settings.trackLocation !== false) {
			setExtractionStep('location');

			location = await extractLocation(
				isInitial,
				formattedMessages,
				isInitial ? characterInfo : '',
				previousState?.location ?? null,
				abortController.signal,
			);
		} else {
			// Use previous or undefined
			location = previousState?.location;
		}

		// ========================================
		// STEP 3: Extract Climate (if enabled)
		// ========================================
		let climate: { weather: 'sunny' | 'cloudy' | 'snowy' | 'rainy' | 'windy' | 'thunderstorm'; temperature: number } | undefined;

		if (settings.trackClimate !== false) {
			setExtractionStep('climate');

			// Climate extraction needs time and location - use defaults if not available
			const timeForClimate = narrativeTime ?? getDefaultTime();
			const locationForClimate = location ?? getDefaultLocation();

			climate = await extractClimate(
				isInitial,
				formattedMessages,
				timeForClimate,
				locationForClimate,
				isInitial ? characterInfo : '',
				previousState?.climate ?? null,
				abortController.signal,
			);
		} else {
			// Use previous or undefined
			climate = previousState?.climate;
		}

		// ========================================
		// STEP 4: Extract Characters (if enabled)
		// ========================================
		let characters: Character[] | undefined;

		if (settings.trackCharacters !== false) {
			setExtractionStep('characters');

			// Characters extraction uses location - use default if not available
			const locationForCharacters = location ?? getDefaultLocation();

			characters = await extractCharacters(
				isInitial,
				formattedMessages,
				locationForCharacters,
				isInitial ? userInfo : '',
				isInitial ? characterInfo : '',
				previousState?.characters ?? null,
				abortController.signal,
			);

			// ========================================
			// STEP 4.5: Post-process outfits (only if we have location)
			// ========================================
			if (location) {
				const cleanup = cleanupOutfitsAndMoveProps(characters, location);
				characters = cleanup.characters;
				location = cleanup.location;

				if (cleanup.movedItems.length > 0) {
					console.log('[BlazeTracker] Moved removed clothing to props:', cleanup.movedItems);
				}
			}
		} else {
			// Use previous or undefined
			characters = previousState?.characters;
		}

		// ========================================
		// STEP 5: Extract Scene (conditional)
		// ========================================
		let scene: Scene | undefined;

		if (shouldRunScene) {
			setExtractionStep('scene');

			// Scene needs at least 2 messages for tension analysis
			const sceneMessages = formatMessagesForScene(
				context,
				messageId,
				lastXMessages,
				previousState,
			);

			const isInitialScene = !previousState?.scene;

			// Use characters for context if available, otherwise empty
			const charactersForScene = characters ?? [];

			scene = await extractScene(
				isInitialScene,
				sceneMessages,
				charactersForScene,
				isInitialScene ? userInfo : '',
				isInitialScene ? characterInfo : '',
				previousState?.scene ?? null,
				abortController.signal,
			);
		} else if (settings.trackScene !== false) {
			// Carry forward previous scene
			scene = previousState?.scene;
		}

		// ========================================
		// STEP 6: Assemble Final State
		// ========================================
		setExtractionStep('complete');

		const state: TrackedState = {
			time: narrativeTime,
			location,
			climate,
			scene,
			characters,
		};

		return { state, raw: rawResponses };
	} finally {
		extractionCount--;
		if (extractionCount === 0) {
			setSendButtonState(false);
			setExtractionStep('idle');
		}
		if (currentAbortController === abortController) {
			currentAbortController = null;
		}
	}
}

// ============================================
// Helper Functions
// ============================================

interface ExtractionContext {
	formattedMessages: string;
	characterInfo: string;
	userInfo: string;
}

/**
 * Format messages for scene extraction with a minimum of 2 messages.
 * This ensures we have both sides of the conversation for tension analysis.
 */
function formatMessagesForScene(
	context: STContext,
	messageId: number,
	lastXMessages: number,
	previousState: TrackedState | null,
): string {
	const MIN_SCENE_MESSAGES = 2;

	// Find where previous state was stored
	let stateIdx = -1;
	if (previousState) {
		for (let i = messageId - 1; i >= 0; i--) {
			const msg = context.chat[i];
			const stored = getMessageState(msg);
			if (stored?.state) {
				stateIdx = i;
				break;
			}
		}
	}

	// Calculate start: we want at least MIN_SCENE_MESSAGES, but also respect lastXMessages
	// and include all messages since last state
	const minStart = Math.max(0, messageId - MIN_SCENE_MESSAGES + 1);
	const stateStart = stateIdx >= 0 ? stateIdx + 1 : 0;
	const limitStart = messageId - lastXMessages;

	// Take the earliest of: minimum messages needed, or messages since state
	// But don't go earlier than lastXMessages limit
	const effectiveStart = Math.max(limitStart, Math.min(minStart, stateStart));

	const chatMessages = context.chat.slice(effectiveStart, messageId + 1);

	return chatMessages.map(msg => `${msg.name}: ${msg.mes}`).join('\n\n');
}

function prepareExtractionContext(
	context: STContext,
	messageId: number,
	lastXMessages: number,
	previousState: TrackedState | null,
): ExtractionContext {
	// Find where to start reading messages
	let startIdx = 0;
	if (previousState) {
		for (let i = messageId - 1; i >= 0; i--) {
			const msg = context.chat[i];
			const stored = getMessageState(msg);
			if (stored?.state) {
				startIdx = i + 1; // Start from message AFTER the one with state
				break;
			}
		}
	}

	// Get only new messages (but respect lastXMessages limit)
	const effectiveStart = Math.max(startIdx, messageId - lastXMessages);
	const chatMessages = context.chat.slice(effectiveStart, messageId + 1);

	// Format messages for prompts
	const formattedMessages = chatMessages.map(msg => `${msg.name}: ${msg.mes}`).join('\n\n');

	// Get user persona info
	const userPersona = context.powerUserSettings?.persona_description || '';
	const userInfo = userPersona
		? `Name: ${context.name1}\nDescription: ${userPersona
			.replace(/\{\{user\}\}/gi, context.name1)
			.replace(/\{\{char\}\}/gi, context.name2)}`
		: `Name: ${context.name1}`;

	// Get character info
	const character = context.characters?.[context.characterId];
	const charDescription = (character?.description || 'No description')
		.replace(/\{\{char\}\}/gi, context.name2)
		.replace(/\{\{user\}\}/gi, context.name1);
	const characterInfo = `Name: ${context.name2}\nDescription: ${charDescription}`;

	return { formattedMessages, characterInfo, userInfo };
}

// ============================================
// Outfit Cleanup Post-Processing
// ============================================

/**
 * Regex patterns that indicate an item has been removed.
 * Captures the item name in group 1.
 */
const REMOVED_PATTERNS = [
	/^(.+?)\s*\((?:removed|off|taken off|discarded|dropped|on (?:the )?floor|on (?:the )?ground|cast aside|tossed aside)\)$/i,
	/^(.+?)\s*-\s*(?:removed|off|taken off)$/i,
	/^(?:removed|off|none|nothing|bare|naked)$/i,
];

/**
 * Values that should be treated as null (no item).
 */
const NULL_VALUES = new Set([
	'none',
	'nothing',
	'bare',
	'naked',
	'n/a',
	'na',
	'-',
	'',
]);

interface OutfitCleanupResult {
	characters: Character[];
	location: LocationState;
	movedItems: string[];
}

/**
 * Post-process characters to fix outfit items that the LLM marked as removed
 * but didn't set to null. Moves removed items to location props if not already there.
 */
function cleanupOutfitsAndMoveProps(
	characters: Character[],
	location: LocationState,
): OutfitCleanupResult {
	const movedItems: string[] = [];
	const existingProps = new Set((location.props || []).map(p => p.toLowerCase()));

	const processedCharacters = characters.map(char => {
		if (!char.outfit) return char;

		const newOutfit = { ...char.outfit };
		const outfitSlots = ['head', 'jacket', 'torso', 'legs', 'underwear', 'socks', 'footwear'] as const;

		for (const slot of outfitSlots) {
			const value = newOutfit[slot];
			if (value === null || value === undefined) continue;

			const trimmed = value.trim();

			// Check for explicit null values
			if (NULL_VALUES.has(trimmed.toLowerCase())) {
				newOutfit[slot] = null;
				continue;
			}

			// Check for removal patterns
			for (const pattern of REMOVED_PATTERNS) {
				const match = trimmed.match(pattern);
				if (match) {
					// Extract the item name (group 1, or the whole thing if no group)
					const itemName = match[1]?.trim() || trimmed;

					// Set to null
					newOutfit[slot] = null;

					// Add to props if we have a real item name and it's not already there
					if (itemName && !NULL_VALUES.has(itemName.toLowerCase())) {
						if (!propAlreadyExists(itemName, char.name, existingProps)) {
							const propEntry = `${char.name}'s ${itemName}`;
							movedItems.push(propEntry);
							existingProps.add(propEntry.toLowerCase());
						}
					}
					break;
				}
			}
		}

		return { ...char, outfit: newOutfit };
	});

	// Build new props array if we added items
	const newProps = movedItems.length > 0
		? [...(location.props || []), ...movedItems]
		: location.props;

	return {
		characters: processedCharacters,
		location: { ...location, props: newProps },
		movedItems,
	};
}
