// ============================================
// Chat-Level Narrative State Management
// ============================================

import { EXTENSION_KEY } from '../constants';
import type { NarrativeState, Chapter, Relationship } from '../types/state';
import { NARRATIVE_STATE_VERSION } from '../types/state';

// Re-export the version constant
export { NARRATIVE_STATE_VERSION };

// ============================================
// Storage Keys
// ============================================

const NARRATIVE_KEY = 'narrative';

// ============================================
// Public API
// ============================================

/**
 * Get the narrative state from the chat.
 * Returns null if no narrative state exists.
 */
export function getNarrativeState(): NarrativeState | null {
	const context = SillyTavern.getContext();
	const chat = context.chat;

	if (!chat || chat.length === 0) {
		return null;
	}

	// Narrative state is stored in the first message
	const firstMessage = chat[0];
	const storage = firstMessage.extra?.[EXTENSION_KEY] as Record<string, unknown> | undefined;

	if (!storage || !storage[NARRATIVE_KEY]) {
		return null;
	}

	return storage[NARRATIVE_KEY] as NarrativeState;
}

/**
 * Set the narrative state for the chat.
 * Creates the storage structure if it doesn't exist.
 */
export function setNarrativeState(state: NarrativeState): void {
	const context = SillyTavern.getContext();
	const chat = context.chat;

	if (!chat || chat.length === 0) {
		console.warn('[BlazeTracker] Cannot set narrative state: no chat messages');
		return;
	}

	const firstMessage = chat[0];

	if (!firstMessage.extra) {
		firstMessage.extra = {};
	}

	if (!firstMessage.extra[EXTENSION_KEY]) {
		firstMessage.extra[EXTENSION_KEY] = {};
	}

	(firstMessage.extra[EXTENSION_KEY] as Record<string, unknown>)[NARRATIVE_KEY] = state;
}

/**
 * Initialize a new narrative state with default values.
 */
export function initializeNarrativeState(): NarrativeState {
	return {
		version: NARRATIVE_STATE_VERSION,
		chapters: [],
		relationships: [],
		forecastCache: [],
		locationMappings: [],
	};
}

/**
 * Get or initialize the narrative state.
 * If no state exists, creates and saves a new one.
 * Also handles migrations from older versions.
 */
export function getOrInitializeNarrativeState(): NarrativeState {
	let state = getNarrativeState();

	if (!state) {
		state = initializeNarrativeState();
		setNarrativeState(state);
	} else {
		// Run migrations if needed
		const migrated = migrateNarrativeState(state);
		if (migrated) {
			setNarrativeState(state);
		}
	}

	return state;
}

/**
 * Save the narrative state and persist the chat.
 */
export async function saveNarrativeState(state: NarrativeState): Promise<void> {
	setNarrativeState(state);

	const context = SillyTavern.getContext();
	await context.saveChat();
}

// ============================================
// Migration
// ============================================

/**
 * Migrate narrative state from older versions to current.
 * Returns true if any migration was performed.
 */
function migrateNarrativeState(state: NarrativeState): boolean {
	let migrated = false;

	// Version 1 -> 2: Add versions array to relationships with initial version from current state
	if (!state.version || state.version < 2) {
		for (const rel of state.relationships) {
			if (!rel.versions) {
				// Create initial version from current relationship state
				// Use messageId 0 so it appears from the start of the chat
				rel.versions = [
					{
						messageId: 0,
						status: rel.status,
						aToB: {
							feelings: [...rel.aToB.feelings],
							secrets: [...rel.aToB.secrets],
							wants: [...rel.aToB.wants],
						},
						bToA: {
							feelings: [...rel.bToA.feelings],
							secrets: [...rel.bToA.secrets],
							wants: [...rel.bToA.wants],
						},
						milestones: [...rel.milestones],
					},
				];
			}
		}

		state.version = 2;
		migrated = true;
	}

	return migrated;
}

interface LegacyScene {
	topic: string;
	tone: string;
	tension: {
		level: string;
		direction: string;
		type: string;
	};
	recentEvents?: string[];
}

interface LegacyTrackedState {
	time?: unknown;
	location?: unknown;
	climate?: unknown;
	scene?: LegacyScene;
	characters?: unknown[];
}

interface LegacyStoredStateData {
	state: LegacyTrackedState;
	extractedAt: string;
}

/**
 * Migrate from legacy state format (recentEvents in Scene) to new format.
 * This should be called when opening a chat that may have old state.
 */
export function migrateFromLegacyState(): NarrativeState {
	const context = SillyTavern.getContext();
	const chat = context.chat;

	// Start with empty narrative state
	const state = initializeNarrativeState();

	if (!chat || chat.length === 0) {
		return state;
	}

	// Collect all legacy recentEvents from messages
	const collectedEvents: string[] = [];

	for (const message of chat) {
		const storage = message.extra?.[EXTENSION_KEY] as
			| Record<number, LegacyStoredStateData>
			| undefined;
		if (!storage) continue;

		// Check all swipes
		for (const swipeData of Object.values(storage)) {
			if (
				typeof swipeData === 'object' &&
				swipeData?.state?.scene?.recentEvents
			) {
				const events = swipeData.state.scene.recentEvents;
				if (Array.isArray(events)) {
					for (const event of events) {
						if (
							typeof event === 'string' &&
							!collectedEvents.includes(event)
						) {
							collectedEvents.push(event);
						}
					}
				}
			}
		}
	}

	// Note: We don't convert legacy string events to TimestampedEvents here
	// because we don't have the timestamp/tension/location info.
	// The legacy events are simply not migrated - new events will be extracted going forward.

	return state;
}

// ============================================
// Update Helpers
// ============================================

/**
 * Add a chapter to the narrative state.
 */
export function addChapter(state: NarrativeState, chapter: Chapter): void {
	state.chapters.push(chapter);
}

/**
 * Update or add a relationship in the narrative state.
 */
export function updateRelationship(state: NarrativeState, relationship: Relationship): void {
	const key = relationship.pair.join('|');
	const existingIndex = state.relationships.findIndex(r => r.pair.join('|') === key);

	if (existingIndex >= 0) {
		state.relationships[existingIndex] = relationship;
	} else {
		state.relationships.push(relationship);
	}
}

/**
 * Get a relationship by character pair.
 */
export function getRelationship(
	state: NarrativeState,
	char1: string,
	char2: string,
): Relationship | null {
	const pair = [char1, char2].sort() as [string, string];
	const key = pair.join('|');

	return state.relationships.find(r => r.pair.join('|') === key) ?? null;
}
