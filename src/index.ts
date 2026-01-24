import type { STContext } from './types/st';
import {
	setupExtractionAbortHandler,
	wasGenerationAborted,
	isBatchExtractionInProgress,
} from './extractors/extractState';
import { initSettingsUI } from './ui/settingsUI';
import {
	initStateDisplay,
	injectStyles,
	renderMessageState,
	renderAllStates,
	doExtractState,
	isManualExtractionInProgress,
	unmountAllRoots,
} from './ui/stateDisplay';
import { settingsManager, getSettings } from './settings';
import { updateInjectionFromChat } from './injectors/injectState';
import { EXTENSION_KEY } from './constants';
import { getMessageState } from './utils/messageState';
import { migrateOldTimeFormats } from './migrations/migrateOldTime';
import { registerSlashCommands, runExtractAll } from './commands/slashCommands';
import {
	getNarrativeState,
	getOrInitializeNarrativeState,
	initializeNarrativeState,
	setNarrativeState,
} from './state/narrativeState';
import { st_echo } from 'sillytavern-utils-lib/config';

function log(..._args: unknown[]) {
	// Logging disabled for production
}

/**
 * Check if chat has legacy BlazeTracker data without narrative state.
 * This indicates the ancient format that needs full re-extraction.
 */
function hasLegacyDataWithoutNarrativeState(context: STContext): boolean {
	// If there's already a narrative state, we're good
	const narrativeState = getNarrativeState();
	if (narrativeState) {
		return false;
	}

	// Check if any messages have old BlazeTracker data
	for (const message of context.chat) {
		if (message.extra?.[EXTENSION_KEY]) {
			return true;
		}
	}

	return false;
}

/**
 * Show popup offering migration options when legacy data is detected.
 */
async function showLegacyDataPopup(context: STContext): Promise<void> {
	return new Promise(resolve => {
		const container = document.createElement('div');
		container.innerHTML = `
			<div style="padding: 10px;">
				<p style="margin-bottom: 15px;">
					<strong>🔥 BlazeTracker: Outdated Data Detected</strong>
				</p>
				<p style="margin-bottom: 15px;">
					This chat has tracker data from an older version that is no longer compatible.
				</p>
				<div style="display: flex; flex-direction: column; gap: 10px;">
					<button id="bt-migrate-all" class="menu_button" style="padding: 10px; width: 100%;">
						<strong>Re-extract All State</strong> (slow, accurate)
						<br><small>Rebuild state for every message. Best for important chats.</small>
					</button>
					<button id="bt-migrate-recent" class="menu_button" style="padding: 10px; width: 100%;">
						<strong>Re-extract Recent State</strong> (fast)
						<br><small>Only extract the latest message. Good enough for most cases.</small>
					</button>
					<button id="bt-migrate-empty" class="menu_button" style="padding: 10px; width: 100%;">
						<strong>Initialize Empty State</strong>
						<br><small style="color: #f59e0b;">⚠️ Discards old data. State will build from new messages.</small>
					</button>
				</div>
			</div>
		`;

		// Show as TEXT popup (no buttons) - we provide our own
		context.callGenericPopup(container, context.POPUP_TYPE.TEXT, null, {
			wide: true,
		});

		// Wire up button handlers
		const handleMigrateAll = async () => {
			cleanup();
			log('User chose to re-extract all messages');
			st_echo?.('info', '🔥 Starting full re-extraction...');

			// Unmount all roots first to prevent stale UI
			unmountAllRoots();

			const state = initializeNarrativeState();
			setNarrativeState(state);
			clearAllPerMessageState(context);
			await context.saveChat();

			const { extracted, failed } = await runExtractAll();
			st_echo?.(
				'success',
				`🔥 Re-extraction complete: ${extracted} extracted, ${failed} failed`,
			);
			resolve();
		};

		const handleMigrateRecent = async () => {
			cleanup();
			log('User chose to re-extract recent message only');
			st_echo?.('info', '🔥 Re-extracting recent state...');

			// Unmount all roots first to prevent stale UI
			unmountAllRoots();

			const state = initializeNarrativeState();
			setNarrativeState(state);
			clearAllPerMessageState(context);
			await context.saveChat();

			// Just extract the most recent message
			const lastMessageId = context.chat.length - 1;
			if (lastMessageId > 0) {
				await doExtractState(lastMessageId);
			}

			renderAllStates();
			st_echo?.('success', '🔥 Recent state extracted');
			resolve();
		};

		const handleMigrateEmpty = async () => {
			cleanup();
			log('User chose to initialize empty state');

			// Unmount all roots first to prevent stale UI
			unmountAllRoots();

			const state = initializeNarrativeState();
			setNarrativeState(state);
			// Don't clear per-message state - just let it be ignored
			await context.saveChat();

			renderAllStates();
			st_echo?.('info', '🔥 Initialized with empty state');
			resolve();
		};

		const cleanup = () => {
			// Close the popup
			(document.querySelector('.popup-button-ok') as HTMLElement)?.click();
		};

		// Add event listeners after a tick to ensure DOM is ready
		setTimeout(() => {
			document.getElementById('bt-migrate-all')?.addEventListener(
				'click',
				handleMigrateAll,
			);
			document.getElementById('bt-migrate-recent')?.addEventListener(
				'click',
				handleMigrateRecent,
			);
			document.getElementById('bt-migrate-empty')?.addEventListener(
				'click',
				handleMigrateEmpty,
			);
		}, 0);
	});
}

/**
 * Clear all per-message BlazeTracker state.
 */
function clearAllPerMessageState(context: STContext): void {
	for (let i = 0; i < context.chat.length; i++) {
		const message = context.chat[i];
		if (message.extra && message.extra[EXTENSION_KEY]) {
			delete message.extra[EXTENSION_KEY];
		}
	}
}

async function init() {
	const context = SillyTavern.getContext();

	// Inject CSS first
	injectStyles();

	// Initialize settings
	await settingsManager.initializeSettings();
	await initSettingsUI();

	// Initialize state display (handles chat change)
	initStateDisplay();
	setupExtractionAbortHandler();

	// Register slash commands
	registerSlashCommands();

	const settings = getSettings();
	const autoExtractResponses =
		settings.autoMode === 'responses' || settings.autoMode === 'both';
	const autoExtractInputs = settings.autoMode === 'inputs' || settings.autoMode === 'both';

	// Hook user messages
	context.eventSource.on(context.event_types.USER_MESSAGE_RENDERED, (async (
		messageId: number,
	) => {
		if (autoExtractInputs) {
			log('Auto-extracting for user message:', messageId);
			await doExtractState(messageId);
			updateInjectionFromChat();
		} else {
			// Just render existing state (or nothing)
			setTimeout(() => renderMessageState(messageId), 100);
		}
	}) as (...args: unknown[]) => void);

	// Re-extract on message edit
	context.eventSource.on(context.event_types.MESSAGE_EDITED, (async (messageId: number) => {
		const lastIndex = context.chat.length - 1;

		// Only re-extract if editing one of the last 2 messages
		if (messageId >= lastIndex - 1 && messageId !== 0) {
			if (autoExtractResponses || autoExtractInputs) {
				log('Re-extracting for edited message:', messageId);
				await doExtractState(messageId);
			}
		}
	}) as (...args: unknown[]) => void);

	// Re-render all on generation end (to catch any we missed)
	if (autoExtractResponses) {
		// This ensures the message is fully rendered and DOM is stable
		context.eventSource.on(context.event_types.GENERATION_ENDED, (async (
			_messageId: number,
		) => {
			// Yield to microtask queue - ensures any synchronous
			// GENERATION_STOPPED handlers complete first
			await Promise.resolve();

			// Skip extraction if the generation was aborted
			if (wasGenerationAborted()) {
				log('Generation was aborted, skipping extraction');
				return;
			}

			// Skip if batch extraction is in progress (bt-extract-all)
			if (isBatchExtractionInProgress()) {
				log('Batch extraction in progress, skipping auto-extraction');
				return;
			}

			// Skip if manual extraction is in progress (fire button, slash command)
			if (isManualExtractionInProgress()) {
				log('Manual extraction in progress, skipping auto-extraction');
				return;
			}

			// messageId might not be passed, get the last message
			const stContext = SillyTavern.getContext() as STContext;
			const lastMessageId = stContext.chat.length - 1;

			if (lastMessageId <= 0) return;

			const message = stContext.chat[lastMessageId];
			// Only extract for AI messages
			if (message.is_user) return;

			log('Auto-extracting for completed generation:', lastMessageId);
			await doExtractState(lastMessageId);
		}) as (...args: unknown[]) => void);
	}

	// Update injection on chat change
	context.eventSource.on(context.event_types.CHAT_CHANGED, (async () => {
		const ctx = SillyTavern.getContext() as STContext;
		const settings = getSettings();

		// Check for ancient legacy data that needs full re-extraction
		if (hasLegacyDataWithoutNarrativeState(ctx)) {
			log('Detected legacy BlazeTracker data without narrative state');
			// Show popup - don't await, let it run in background
			showLegacyDataPopup(ctx);
		} else {
			// Ensure narrative state is migrated to latest version
			getOrInitializeNarrativeState();
		}

		// Run time format migration
		if (settings.profileId) {
			await migrateOldTimeFormats(ctx, settings.profileId);
		}

		setTimeout(() => {
			renderAllStates();
			updateInjectionFromChat();
		}, 100);
	}) as (...args: unknown[]) => void);

	const handleSwipe = async (messageId: number) => {
		log('Swipe detected for message:', messageId);

		const stContext = SillyTavern.getContext() as STContext;
		const message = stContext.chat[messageId];
		const existingState = getMessageState(message);

		if (existingState) {
			// This swipe already has state, render it
			log('State exists for this swipe');
			renderMessageState(messageId, existingState);
		} else {
			// No state - either new generation in progress or old unextracted swipe
			// Don't auto-extract here - could be mid-generation with wrong content
			// GENERATION_ENDED will handle new generations
			// User can manually extract old swipes if needed
			renderMessageState(messageId, null);
		}

		updateInjectionFromChat();
	};

	// Try MESSAGE_SWIPED event
	if (context.event_types.MESSAGE_SWIPED) {
		context.eventSource.on(context.event_types.MESSAGE_SWIPED, (async (data: any) => {
			// Event data format varies: could be number, { message }, { messageId }, { id }
			const messageId =
				typeof data === 'number'
					? data
					: (data?.message ?? data?.messageId ?? data?.id);

			if (typeof messageId === 'number') {
				// Small delay to let ST update the swipe data
				setTimeout(() => handleSwipe(messageId), 50);
			}
		}) as (...args: unknown[]) => void);
		log('MESSAGE_SWIPED handler registered');
	}

	// Try SWIPE_CHANGED event (alternate name)
	if (context.event_types.SWIPE_CHANGED) {
		context.eventSource.on(context.event_types.SWIPE_CHANGED, (async (data: any) => {
			const messageId =
				typeof data === 'number'
					? data
					: (data?.message ?? data?.messageId ?? data?.id);

			if (typeof messageId === 'number') {
				setTimeout(() => handleSwipe(messageId), 50);
			}
		}) as (...args: unknown[]) => void);
		log('SWIPE_CHANGED handler registered');
	}

	log('Event hooks registered.');
}

// Wait for DOM/ST to be ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
