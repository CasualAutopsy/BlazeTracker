import type { STContext } from '../types/st';
import type {
	TrackedState,
	NarrativeDateTime,
	Scene,
	Character,
	TimestampedEvent,
	Climate,
	ProceduralClimate,
	Relationship,
} from '../types/state';
import { getSettings } from '../settings';
import { getMessageState, setMessageState } from '../utils/messageState';

// Import extractors
import { extractTime, setTimeTrackerState } from './extractTime';
import { extractLocation, type LocationState } from './extractLocation';
import { extractClimateWithContext } from './extractClimate';
import { extractCharacters } from './extractCharacters';
import { extractScene, shouldExtractScene } from './extractScene';
import { extractEvent } from './extractEvent';
import { extractChapterBoundary } from './extractChapter';
import {
	extractInitialRelationship,
	updateRelationshipFromSignal,
	refreshRelationship,
} from './extractRelationships';
import { propAlreadyExists } from '../utils/clothingMatch';
import { setExtractionStep, setEnabledSteps } from './extractionProgress';
import {
	getOrInitializeNarrativeState,
	saveNarrativeState,
	addChapter,
	updateRelationship,
	getRelationship,
} from '../state/narrativeState';
import { checkChapterBoundary } from '../state/chapters';
import {
	findUnestablishedPairs,
	popVersionForMessage,
	getLatestVersionMessageId,
} from '../state/relationships';

// ============================================
// Module State
// ============================================

let currentAbortController: AbortController | null = null;
let extractionCount = 0;
let generationWasStopped = false;
let batchExtractionInProgress = false;

/**
 * Check if a batch extraction is currently in progress.
 */
export function isBatchExtractionInProgress(): boolean {
	return batchExtractionInProgress;
}

/**
 * Set the batch extraction flag. Used by bt-extract-all to prevent
 * GENERATION_ENDED handler from interfering.
 */
export function setBatchExtractionInProgress(value: boolean): void {
	batchExtractionInProgress = value;
}

// ============================================
// Types
// ============================================

export interface ExtractionResult {
	state: TrackedState;
	raw: Record<string, string>;
	/** Weather transition text to inject into prompt (if procedural weather enabled) */
	weatherTransition?: string;
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

function _getDefaultClimate() {
	return {
		weather: 'sunny' as const,
		temperature: 70,
	};
}

function _getDefaultCharacters(): Character[] {
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

		// Determine if event extraction should run
		const shouldRunEvent = settings.trackEvents !== false && isAssistantMessage;

		// Configure enabled steps for progress display
		setEnabledSteps({
			time: settings.trackTime !== false,
			location: settings.trackLocation !== false,
			climate: settings.trackClimate !== false,
			characters: settings.trackCharacters !== false,
			scene: shouldRunScene,
			event: shouldRunEvent,
		});

		// ========================================
		// STEP 0: Initialize time tracker from previous state
		// ========================================
		if (previousState?.time) {
			setTimeTrackerState(previousState.time);
		}

		// ========================================
		// Get narrative state (needed for climate cache and relationships)
		// ========================================
		const narrativeState = getOrInitializeNarrativeState();

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
		let climate: Climate | ProceduralClimate | undefined;
		let weatherTransition: string | null = null;

		if (settings.trackClimate !== false) {
			setExtractionStep('climate');

			// Climate extraction needs time and location - use defaults if not available
			const timeForClimate = narrativeTime ?? getDefaultTime();
			const locationForClimate = location ?? getDefaultLocation();

			const climateResult = await extractClimateWithContext({
				isInitial,
				messages: formattedMessages,
				narrativeTime: timeForClimate,
				location: locationForClimate,
				characterInfo: isInitial ? characterInfo : '',
				previousClimate: previousState?.climate ?? null,
				forecastCache: narrativeState.forecastCache,
				locationMappings: narrativeState.locationMappings,
				abortSignal: abortController.signal,
			});

			climate = climateResult.climate;
			weatherTransition = climateResult.transition;

			// Update narrative state caches if they changed
			if (climateResult.forecastCache) {
				narrativeState.forecastCache = climateResult.forecastCache;
			}
			if (climateResult.locationMappings) {
				narrativeState.locationMappings = climateResult.locationMappings;
			}
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
		// STEP 6: Extract Event (conditional)
		// ========================================
		// Filter out any events from this messageId (handles re-extraction)
		let currentEvents: TimestampedEvent[] = (previousState?.currentEvents ?? []).filter(
			e => e.messageId !== messageId,
		);

		if (shouldRunEvent) {
			setExtractionStep('event');

			// Use effective values for event extraction
			const timeForEvent = narrativeTime ?? getDefaultTime();
			const locationForEvent = location ?? getDefaultLocation();
			const sceneForEvent = scene ?? getDefaultScene();

			const extractedEvent = await extractEvent({
				messages: formattedMessages,
				messageId,
				currentTime: timeForEvent,
				currentLocation: locationForEvent,
				currentTensionType: sceneForEvent.tension.type,
				currentTensionLevel: sceneForEvent.tension.level,
				relationships: narrativeState.relationships,
				characters: characters ?? [],
				abortSignal: abortController.signal,
			});

			if (extractedEvent) {
				// Append the new event with messageId for re-extraction tracking
				const eventWithId: TimestampedEvent = {
					...extractedEvent,
					messageId,
				};
				currentEvents = [...currentEvents, eventWithId];

				// Apply relationship signal if present
				if (
					extractedEvent.relationshipSignal &&
					settings.trackRelationships !== false
				) {
					const signal = extractedEvent.relationshipSignal;
					const [char1, char2] = signal.pair;

					let relationship = getRelationship(
						narrativeState,
						char1,
						char2,
					);

					if (relationship) {
						// Pop version if re-extracting this message (swipe/re-extract)
						popVersionForMessage(relationship, messageId);
						// Check if signal has milestones - if so, do a full LLM refresh
						const hasMilestones =
							signal.milestones &&
							signal.milestones.length > 0;

						if (hasMilestones) {
							const relationshipMessages =
								formatMessagesForRelationship(
									context,
									messageId,
									lastXMessages,
									relationship,
								);

							const refreshed = await refreshRelationship(
								{
									relationship,
									events: currentEvents,
									messages: relationshipMessages,
									messageId,
									abortSignal:
										abortController.signal,
								},
							);

							if (refreshed) {
								// Apply milestones from signal (LLM might not include them)
								relationship =
									updateRelationshipFromSignal(
										refreshed,
										signal,
										messageId,
									);
							} else {
								// Fallback to simple update if refresh fails
								relationship =
									updateRelationshipFromSignal(
										relationship,
										signal,
										messageId,
									);
							}
						} else {
							// Simple update for non-milestone signals
							relationship = updateRelationshipFromSignal(
								relationship,
								signal,
								messageId,
							);
						}

						updateRelationship(narrativeState, relationship);
					} else {
						// Need to initialize this relationship first
						const relationshipMessages =
							formatMessagesForRelationship(
								context,
								messageId,
								lastXMessages,
								undefined, // No existing relationship
							);

						const newRelationship =
							await extractInitialRelationship({
								char1,
								char2,
								messages: relationshipMessages,
								characterInfo: isInitial
									? characterInfo
									: '',
								messageId,
								currentTime: narrativeTime,
								currentLocation: location,
								abortSignal: abortController.signal,
							});

						if (newRelationship) {
							// Apply the signal to the new relationship
							const withSignal =
								updateRelationshipFromSignal(
									newRelationship,
									signal,
									messageId,
								);
							updateRelationship(
								narrativeState,
								withSignal,
							);
						}
					}
				}
			}
		}

		// ========================================
		// STEP 6.3: Initialize Missing Relationships
		// ========================================
		// Check if there are character pairs that don't have relationships yet
		if (settings.trackRelationships !== false && characters && characters.length >= 2) {
			const characterNames = characters.map(c => c.name);
			const unestablishedPairs = findUnestablishedPairs(
				characterNames,
				narrativeState.relationships,
			);

			// Limit to initializing one relationship per extraction to avoid slowdown
			if (unestablishedPairs.length > 0) {
				const [char1, char2] = unestablishedPairs[0];

				const relationshipMessages = formatMessagesForRelationship(
					context,
					messageId,
					lastXMessages,
					undefined, // No existing relationship
				);

				const newRelationship = await extractInitialRelationship({
					char1,
					char2,
					messages: relationshipMessages,
					characterInfo: isInitial ? characterInfo : '',
					messageId,
					currentTime: narrativeTime,
					currentLocation: location,
					abortSignal: abortController.signal,
				});

				if (newRelationship) {
					updateRelationship(narrativeState, newRelationship);
				}
			}
		}

		// ========================================
		// STEP 6.5: Check Chapter Boundary
		// ========================================
		let currentChapter = previousState?.currentChapter ?? 0;
		let chapterEnded: TrackedState['chapterEnded'] = undefined;

		// Only check for chapter boundary if we have a previous state (not initial extraction)
		if (previousState && currentEvents.length > 0) {
			const boundaryCheck = checkChapterBoundary(
				previousState.location,
				location,
				previousState.time,
				narrativeTime,
			);

			if (boundaryCheck.triggered) {
				// Get the time range from events
				const startTime =
					currentEvents[0]?.timestamp ??
					previousState.time ??
					getDefaultTime();
				const endTime = narrativeTime ?? getDefaultTime();
				const primaryLocation = previousState.location
					? `${previousState.location.area} - ${previousState.location.place}`
					: 'Unknown';

				// Extract chapter summary via LLM
				const chapterResult = await extractChapterBoundary({
					events: currentEvents,
					narrativeState,
					chapterIndex: currentChapter,
					startTime,
					endTime,
					primaryLocation,
					abortSignal: abortController.signal,
				});

				if (chapterResult.isChapterBoundary && chapterResult.chapter) {
					// Store chapter ended summary for display
					chapterEnded = {
						index: currentChapter,
						title: chapterResult.chapter.title,
						summary: chapterResult.chapter.summary,
						eventCount: currentEvents.length,
						reason: boundaryCheck.reason!,
					};

					// Add chapter to narrative state
					addChapter(narrativeState, chapterResult.chapter);
					await saveNarrativeState(narrativeState);

					// Increment chapter counter and clear current events
					currentChapter++;
					currentEvents = [];
				}
			}
		}

		// ========================================
		// STEP 7: Assemble Final State
		// ========================================
		setExtractionStep('complete');

		const state: TrackedState = {
			time: narrativeTime,
			location,
			climate,
			scene,
			characters,
			currentChapter,
			currentEvents: currentEvents.length > 0 ? currentEvents : undefined,
			chapterEnded,
		};

		return {
			state,
			raw: rawResponses,
			weatherTransition: weatherTransition ?? undefined,
		};
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
// Re-extraction Event Cleanup
// ============================================

/**
 * Update subsequent messages after re-extracting a message.
 * Removes old events from the re-extracted messageId and optionally adds the new event.
 */
export function updateSubsequentMessagesEvents(
	context: STContext,
	reExtractedMessageId: number,
	newEvent: TimestampedEvent | undefined,
): void {
	// Iterate through all messages after the re-extracted one
	for (let i = reExtractedMessageId + 1; i < context.chat.length; i++) {
		const message = context.chat[i];
		const stateData = getMessageState(message);

		if (!stateData?.state?.currentEvents) {
			continue;
		}

		// Filter out events from the re-extracted messageId
		const filteredEvents = stateData.state.currentEvents.filter(
			(e: TimestampedEvent) => e.messageId !== reExtractedMessageId,
		);

		// If we have a new event and it should be included (before any chapter boundary that cleared events)
		// Add it to the filtered list if this message's events include events after the new one
		let updatedEvents = filteredEvents;
		if (newEvent) {
			// Insert the new event at the right position (by messageId order)
			const insertIndex = filteredEvents.findIndex(
				(e: TimestampedEvent) => (e.messageId ?? 0) > reExtractedMessageId,
			);
			if (insertIndex === -1) {
				// No events after this one, append
				updatedEvents = [...filteredEvents, newEvent];
			} else {
				// Insert before events from later messages
				updatedEvents = [
					...filteredEvents.slice(0, insertIndex),
					newEvent,
					...filteredEvents.slice(insertIndex),
				];
			}
		}

		// Update the message state
		const newStateData = {
			...stateData,
			state: {
				...stateData.state,
				currentEvents: updatedEvents.length > 0 ? updatedEvents : undefined,
			},
		};

		setMessageState(message, newStateData);
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

/**
 * Format messages for relationship extraction.
 * Uses messages since the last status change (or lastXMessages, whichever is smaller).
 * Ensures a minimum of MIN_RELATIONSHIP_MESSAGES for context.
 */
function formatMessagesForRelationship(
	context: STContext,
	messageId: number,
	lastXMessages: number,
	relationship?: Relationship,
): string {
	const MIN_RELATIONSHIP_MESSAGES = 3;

	// Calculate the start based on last version's messageId
	let statusChangeStart = 0;
	const lastVersionMessageId = relationship
		? getLatestVersionMessageId(relationship)
		: undefined;
	if (lastVersionMessageId !== undefined) {
		// Start from the message after the last status change
		statusChangeStart = lastVersionMessageId + 1;
	}

	// Calculate start: take minimum of (messages since status change, lastXMessages)
	// But ensure we have at least MIN_RELATIONSHIP_MESSAGES
	const minStart = Math.max(0, messageId - MIN_RELATIONSHIP_MESSAGES + 1);
	const limitStart = Math.max(0, messageId - lastXMessages);

	// Take the later of: limit start or status change start
	// This ensures we don't exceed lastXMessages
	const constrainedStart = Math.max(limitStart, statusChangeStart);

	// But ensure we have at least MIN_RELATIONSHIP_MESSAGES
	const effectiveStart = Math.min(constrainedStart, minStart);

	const chatMessages = context.chat.slice(effectiveStart, messageId + 1);
	return chatMessages.map(msg => `${msg.name}: ${msg.mes}`).join('\n\n');
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
const NULL_VALUES = new Set(['none', 'nothing', 'bare', 'naked', 'n/a', 'na', '-', '']);

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
		const outfitSlots = [
			'head',
			'neck',
			'jacket',
			'back',
			'torso',
			'legs',
			'underwear',
			'socks',
			'footwear',
		] as const;

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
						if (
							!propAlreadyExists(
								itemName,
								char.name,
								existingProps,
							)
						) {
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
	const newProps =
		movedItems.length > 0 ? [...(location.props || []), ...movedItems] : location.props;

	return {
		characters: processedCharacters,
		location: { ...location, props: newProps },
		movedItems,
	};
}
