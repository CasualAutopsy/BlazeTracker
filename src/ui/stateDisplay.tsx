import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import type {
	TrackedState,
	StoredStateData,
	NarrativeState,
	TimestampedEvent,
} from '../types/state';
import type { STContext } from '../types/st';
import { st_echo } from 'sillytavern-utils-lib/config';
import { extractState, updateSubsequentMessagesEvents } from '../extractors/extractState';
import {
	onExtractionProgress,
	getStepLabel,
	type ExtractionStep,
	type ExtractionProgress,
} from '../extractors/extractionProgress';
import { getMessageState, setMessageState } from '../utils/messageState';
import { openStateEditor } from './stateEditor';
import { updateInjectionFromChat } from '../injectors/injectState';
import { getSettings } from '../settings';
import { resetTimeTracker, setTimeTrackerState } from '../extractors/extractTime';
import { EXTENSION_NAME } from '../constants';
import { formatTime, formatLocation } from './formatters';
import {
	SceneDisplay,
	CharacterCard,
	LoadingIndicator,
	ClimateDisplay,
} from './components/display';
import { EventList } from './components/EventList';
import { NarrativeModal, type DeletedEventInfo } from './components/NarrativeModal';
import { getNarrativeState, saveNarrativeState } from '../state/narrativeState';
import { clearAllMilestonesForMessage, getRelationshipsAtMessage } from '../state/relationships';

// Track React roots so we can unmount/update them
const roots = new Map<number, ReactDOM.Root>();

// Track ongoing extractions - exported so index.ts can check
export const extractionInProgress = new Set<number>();

// Track manual extraction in progress (prevents auto-extraction during manual)
let manualExtractionInProgress = false;

// Track current extraction step for UI updates
let currentExtractionStep: ExtractionStep = 'idle';
let currentExtractionMessageId: number | null = null;

/**
 * Check if a manual extraction is currently in progress.
 */
export function isManualExtractionInProgress(): boolean {
	return manualExtractionInProgress;
}

/**
 * Set the manual extraction flag.
 */
export function setManualExtractionInProgress(value: boolean): void {
	manualExtractionInProgress = value;
}

// --- React Components ---

interface StateDisplayProps {
	stateData: StoredStateData | null;
	narrativeState: NarrativeState | null;
	messageId: number;
	isExtracting?: boolean;
	extractionStep?: ExtractionStep;
}

function StateDisplay({
	stateData,
	narrativeState,
	messageId,
	isExtracting,
	extractionStep,
}: StateDisplayProps) {
	const [showModal, setShowModal] = useState(false);

	const handleOpenModal = useCallback(() => {
		setShowModal(true);
	}, []);

	const handleCloseModal = useCallback(() => {
		setShowModal(false);
	}, []);

	// Handle saving narrative state from the modal
	const handleNarrativeSave = useCallback(
		async (
			updatedState: NarrativeState,
			deletedEvents: DeletedEventInfo[],
			updatedCurrentEvents?: TimestampedEvent[],
		) => {
			const context = SillyTavern.getContext() as STContext;

			// Save the narrative state
			await saveNarrativeState(updatedState);

			// Sync deleted events: remove from affected messages' currentEvents
			if (deletedEvents.length > 0 || updatedCurrentEvents) {
				// Group deletions by messageId
				const deletionsByMessage = new Map<number, Set<string>>();
				for (const del of deletedEvents) {
					if (!deletionsByMessage.has(del.messageId)) {
						deletionsByMessage.set(del.messageId, new Set());
					}
					deletionsByMessage.get(del.messageId)!.add(del.summary);
				}

				// Update each affected message
				for (const [messageId, deletedSummaries] of deletionsByMessage) {
					const message = context.chat[messageId];
					if (!message) continue;

					const msgStateData = getMessageState(message);
					if (!msgStateData?.state.currentEvents) continue;

					// Filter out deleted events
					msgStateData.state.currentEvents =
						msgStateData.state.currentEvents.filter(
							event =>
								!deletedSummaries.has(
									event.summary,
								),
						);
					setMessageState(message, msgStateData);
				}

				// If we have updated current events, update the most recent message
				if (updatedCurrentEvents && context.chat.length > 0) {
					// Find the most recent message that has state
					for (let i = context.chat.length - 1; i >= 0; i--) {
						const message = context.chat[i];
						const msgStateData = getMessageState(message);
						if (msgStateData?.state) {
							msgStateData.state.currentEvents =
								updatedCurrentEvents;
							setMessageState(message, msgStateData);
							break;
						}
					}
				}

				await context.saveChat();
			}

			// Re-render all states to reflect the changes
			renderAllStates();
		},
		[],
	);

	// Show loading state while extracting
	if (isExtracting) {
		const stepLabel = extractionStep ? getStepLabel(extractionStep) : 'Extracting...';
		return <LoadingIndicator stepLabel={stepLabel} />;
	}

	if (!stateData) {
		return null;
	}

	const { state } = stateData;
	const settings = getSettings();

	// Determine what to show based on settings AND data availability
	const showTime = settings.trackTime !== false && state.time;
	const showLocation = settings.trackLocation !== false && state.location;
	const showClimate = settings.trackClimate !== false && state.climate;
	const showScene = settings.trackScene !== false && state.scene;
	const showCharacters =
		settings.trackCharacters !== false &&
		state.characters &&
		state.characters.length > 0;

	// If nothing to show, render nothing
	const hasAnythingToShow =
		showTime || showLocation || showClimate || showScene || showCharacters;
	if (!hasAnythingToShow) {
		return null;
	}

	// Calculate details summary
	const characterCount = state.characters?.length ?? 0;
	const propsCount = state.location?.props?.length ?? 0;
	const showDetails =
		(showCharacters && characterCount > 0) || (showLocation && propsCount > 0);

	// Get relationships for character cards, versioned to this message's time
	const allRelationships = narrativeState?.relationships ?? [];
	const relationships = getRelationshipsAtMessage(allRelationships, messageId);

	// Get current events for display
	const currentEvents = state.currentEvents ?? [];
	const showEvents = currentEvents.length > 0;

	// Get present character names for context
	const presentCharacters = state.characters?.map(c => c.name) ?? [];

	// Check if narrative modal should be available (has chapters or relationships)
	const hasNarrativeContent =
		narrativeState &&
		(narrativeState.chapters.length > 0 || narrativeState.relationships.length > 0);

	return (
		<div className="bt-state-container">
			{/* Time/Weather/Location row - only show if at least one is enabled */}
			{(showTime || showClimate || showLocation) && (
				<div className="bt-state-summary">
					{showTime && state.time && (
						<span className="bt-time">
							<i className="fa-regular fa-clock"></i>{' '}
							{formatTime(
								state.time,
								settings.timeFormat,
							)}
						</span>
					)}
					{showClimate && state.climate && (
						<ClimateDisplay
							climate={state.climate}
							temperatureUnit={settings.temperatureUnit}
						/>
					)}
					{showLocation && state.location && (
						<span className="bt-location">
							<i className="fa-solid fa-location-dot"></i>{' '}
							{formatLocation(state.location)}
						</span>
					)}
				</div>
			)}

			{/* Scene summary */}
			{showScene && state.scene ? (
				<SceneDisplay
					scene={state.scene}
					onMoreInfoClick={
						hasNarrativeContent ? handleOpenModal : undefined
					}
				/>
			) : showScene && !state.scene ? (
				<div className="bt-scene-pending">
					<i className="fa-solid fa-hourglass-half"></i>
					<span>
						Scene analysis will happen after first character
						response
					</span>
				</div>
			) : null}

			{/* Current Events OR Chapter Ended Summary (same slot) */}
			{state.chapterEnded ? (
				<div className="bt-current-events">
					<div className="bt-chapter-ended">
						<div className="bt-chapter-ended-header">
							<i className="fa-solid fa-book"></i>
							<span className="bt-chapter-ended-title">
								Chapter{' '}
								{state.chapterEnded.index + 1}:{' '}
								{state.chapterEnded.title}
							</span>
							<span className="bt-chapter-ended-badge">
								{state.chapterEnded.reason ===
									'location_change' &&
									'Location changed'}
								{state.chapterEnded.reason ===
									'time_jump' && 'Time skip'}
								{state.chapterEnded.reason ===
									'both' && 'Location + Time'}
								{state.chapterEnded.reason ===
									'manual' && 'Manual'}
							</span>
						</div>
						<div className="bt-chapter-ended-summary">
							{state.chapterEnded.summary}
						</div>
						<div className="bt-chapter-ended-stats">
							<span>
								{state.chapterEnded.eventCount}{' '}
								events archived
							</span>
						</div>
					</div>
				</div>
			) : showEvents ? (
				<div className="bt-current-events">
					<EventList
						events={currentEvents.slice(-3)}
						presentCharacters={presentCharacters}
						maxEvents={3}
					/>
					{currentEvents.length > 3 && hasNarrativeContent && (
						<button
							className="bt-view-all-events"
							onClick={handleOpenModal}
						>
							View all {currentEvents.length} events...
						</button>
					)}
				</div>
			) : null}

			{/* Expandable details - only show if there's something to expand */}
			{showDetails && (
				<details className="bt-state-details">
					<summary>
						Details
						{showCharacters &&
							characterCount > 0 &&
							` (${characterCount} characters`}
						{showLocation &&
							propsCount > 0 &&
							`${showCharacters && characterCount > 0 ? ', ' : ' ('}${propsCount} props`}
						{(showCharacters && characterCount > 0) ||
						(showLocation && propsCount > 0)
							? ')'
							: ''}
					</summary>

					{showLocation &&
						state.location &&
						state.location.props &&
						state.location.props.length > 0 && (
							<div className="bt-props-section">
								<span className="bt-props-header">
									Props
								</span>
								<div className="bt-props">
									<ul>
										{state.location.props.map(
											(
												prop,
												idx,
											) => (
												<li
													key={
														idx
													}
												>
													{
														prop
													}
												</li>
											),
										)}
									</ul>
								</div>
							</div>
						)}

					{showCharacters &&
						state.characters &&
						state.characters.length > 0 && (
							<div className="bt-characters">
								{state.characters.map(
									(char, idx) => (
										<CharacterCard
											key={`${char.name}-${idx}`}
											character={
												char
											}
											relationships={
												relationships
											}
										/>
									),
								)}
							</div>
						)}
				</details>
			)}

			{/* Narrative Modal */}
			{showModal && narrativeState && (
				<NarrativeModal
					narrativeState={narrativeState}
					currentEvents={currentEvents}
					presentCharacters={presentCharacters}
					onClose={handleCloseModal}
					onSave={handleNarrativeSave}
					initialTab={
						currentEvents.length > 3 ? 'events' : 'chapters'
					}
				/>
			)}
		</div>
	);
}

// --- State Extraction ---

function getPreviousState(context: STContext, beforeMessageId: number): TrackedState | null {
	for (let i = beforeMessageId - 1; i >= 0; i--) {
		const prev = context.chat[i];
		const trackerData = getMessageState(prev) as StoredStateData | undefined;
		if (trackerData?.state) {
			return trackerData.state;
		}
	}
	return null;
}

export async function doExtractState(
	messageId: number,
	options: { isManual?: boolean } = {},
): Promise<StoredStateData | null> {
	if (extractionInProgress.has(messageId)) {
		return null;
	}

	// Set manual extraction flag if this is a manual trigger
	if (options.isManual) {
		setManualExtractionInProgress(true);
	}

	const context = SillyTavern.getContext() as STContext;
	const message = context.chat[messageId];

	if (!message) {
		console.warn(`[${EXTENSION_NAME}] Message not found:`, messageId);
		return null;
	}

	// Mark extraction in progress and track which message
	extractionInProgress.add(messageId);
	currentExtractionMessageId = messageId;

	// Try to show loading state (synchronous - DOM should be ready since we're called from
	// USER_MESSAGE_RENDERED or GENERATION_ENDED, not during streaming)
	const messageElement = document.querySelector(`[mesid="${messageId}"]`);
	const mesBlock = messageElement?.querySelector('.mes_block');

	if (messageElement && mesBlock) {
		updateMenuButtonState(messageId, true);
		renderMessageStateInternal(
			messageId,
			messageElement,
			null,
			true,
			currentExtractionStep,
		);
	}

	const previousState = getPreviousState(context, messageId);

	// Clear milestones created by this message before re-extraction
	// This applies to all triggers: swiping, editing, fire button, slash commands
	const narrativeState = getNarrativeState();
	if (narrativeState && narrativeState.relationships.length > 0) {
		const removed = clearAllMilestonesForMessage(
			narrativeState.relationships,
			messageId,
		);
		if (removed > 0) {
			await saveNarrativeState(narrativeState);
		}
	}

	try {
		const { state } = await extractState(context, messageId, previousState);

		const stateData: StoredStateData = {
			state,
			extractedAt: new Date().toISOString(),
		};

		if (!message.extra) {
			message.extra = {};
		}
		setMessageState(message, stateData);

		await context.saveChat();

		// Update subsequent messages if this isn't the last message (re-extraction case)
		if (messageId < context.chat.length - 1) {
			// Find the event that was extracted for this specific messageId
			const newEvent = state.currentEvents?.find(e => e.messageId === messageId);

			// Update subsequent messages' events
			updateSubsequentMessagesEvents(context, messageId, newEvent);

			// Save again to persist the updated subsequent messages
			await context.saveChat();
		}

		// Render the extracted state
		if (messageElement) {
			renderMessageStateInternal(messageId, messageElement, stateData, false);
		}

		return stateData;
	} catch (e: any) {
		if (e.name === 'AbortError') {
			st_echo?.('warning', '🔥 Extraction aborted');
		} else {
			console.warn(`[${EXTENSION_NAME}] Extraction failed:`, e);
			st_echo?.('error', `🔥 Extraction failed: ${e.message}`);
		}

		// Clear loading state on error
		if (messageElement) {
			renderMessageStateInternal(messageId, messageElement, null, false);
		}

		return null;
	} finally {
		extractionInProgress.delete(messageId);
		if (currentExtractionMessageId === messageId) {
			currentExtractionMessageId = null;
		}
		// Clear manual extraction flag if we set it
		if (options.isManual) {
			setManualExtractionInProgress(false);
		}
		updateMenuButtonState(messageId, false);
	}
}

// --- Menu Button ---

function updateMenuButtonState(messageId: number, isLoading: boolean) {
	const messageElement = document.querySelector(`[mesid="${messageId}"]`);
	const btn = messageElement?.querySelector('.bt-extract-btn') as HTMLElement;
	if (btn) {
		btn.classList.toggle('bt-loading', isLoading);
		const icon = btn.querySelector('i');
		if (icon) {
			icon.className = isLoading
				? 'fa-solid fa-spinner fa-spin'
				: 'fa-solid fa-fire';
		}
	}
}

function addMenuButton(messageId: number, messageElement: Element) {
	const extraButtons = messageElement.querySelector('.extraMesButtons');
	if (!extraButtons) return;

	if (!extraButtons.querySelector('.bt-extract-btn')) {
		const extractBtn = document.createElement('div');
		extractBtn.className = 'bt-extract-btn mes_button';
		extractBtn.title = 'Extract scene state (BlazeTracker)';
		extractBtn.innerHTML = '<i class="fa-solid fa-fire"></i>';

		extractBtn.addEventListener('click', async e => {
			e.preventDefault();
			e.stopPropagation();
			await doExtractState(messageId, { isManual: true });
		});

		extraButtons.insertBefore(extractBtn, extraButtons.firstChild);
	}

	if (!extraButtons.querySelector('.bt-edit-btn')) {
		const editBtn = document.createElement('div');
		editBtn.className = 'bt-edit-btn mes_button';
		editBtn.title = 'Edit scene state (BlazeTracker)';
		editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';

		editBtn.addEventListener('click', async e => {
			e.preventDefault();
			e.stopPropagation();
			await editMessageState(messageId);
		});

		const extractBtn = extraButtons.querySelector('.bt-extract-btn');
		if (extractBtn) {
			extractBtn.after(editBtn);
		} else {
			extraButtons.insertBefore(editBtn, extraButtons.firstChild);
		}
	}
}

// --- Internal render function (when we already have the element) ---

function renderMessageStateInternal(
	messageId: number,
	messageElement: Element,
	stateData: StoredStateData | null,
	isExtracting: boolean,
	extractionStep?: ExtractionStep,
) {
	addMenuButton(messageId, messageElement);

	const settings = getSettings();
	const isAbove = settings.displayPosition === 'above';

	let needsNewRoot = false;

	let container = messageElement.querySelector('.bt-state-root') as HTMLElement;
	if (!container) {
		container = document.createElement('div');
		container.className = 'bt-state-root';
		needsNewRoot = true;
	}

	// Update position class
	container.classList.toggle('bt-above', isAbove);

	// Insert in correct position
	const mesBlock = messageElement.querySelector('.mes_block');
	const mesText = mesBlock?.querySelector('.mes_text');

	if (needsNewRoot && mesBlock) {
		if (isAbove && mesText) {
			mesBlock.insertBefore(container, mesText);
		} else {
			mesBlock.appendChild(container);
		}
	}

	let root = roots.get(messageId);
	if (needsNewRoot && root) {
		root.unmount();
		root = undefined;
	}

	if (!root) {
		root = ReactDOM.createRoot(container);
		roots.set(messageId, root);
	}

	// Get narrative state from message 0
	const narrativeState = getNarrativeState();

	root.render(
		<StateDisplay
			stateData={stateData}
			narrativeState={narrativeState}
			messageId={messageId}
			isExtracting={isExtracting}
			extractionStep={extractionStep}
		/>,
	);

	// If this is the most recent message, scroll to the end.
	const context = SillyTavern.getContext() as STContext;
	if (messageId === context.chat.length - 1) {
		setTimeout(() => {
			messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}, 50);
	}
}

// --- Public API ---

export function renderMessageState(
	messageId: number,
	stateData?: StoredStateData | null,
	isExtracting: boolean = false,
) {
	// Don't render if extraction is in progress (unless we're explicitly setting isExtracting)
	if (extractionInProgress.has(messageId) && !isExtracting) {
		return;
	}

	const context = SillyTavern.getContext() as STContext;
	const message = context.chat[messageId];

	const messageElement = document.querySelector(`[mesid="${messageId}"]`);
	if (!messageElement) return;

	const currentStateData =
		stateData !== undefined
			? stateData
			: ((getMessageState(message) as StoredStateData | undefined) ?? null);

	renderMessageStateInternal(messageId, messageElement, currentStateData, isExtracting);
}

/** Clear loading state (used when extraction is handled elsewhere) */
export function clearLoadingState(messageId: number): void {
	extractionInProgress.delete(messageId);
	renderMessageState(messageId);
}

export function unmountMessageState(messageId: number) {
	const root = roots.get(messageId);
	if (root) {
		root.unmount();
		roots.delete(messageId);
	}
}

/**
 * Unmount all React roots and clear DOM containers.
 * Use this before bulk operations like bt-extract-all.
 */
export function unmountAllRoots(): void {
	// Remove all DOM containers
	document.querySelectorAll('.bt-state-root').forEach(el => el.remove());

	// Unmount all React roots
	for (const [_messageId, root] of roots) {
		root.unmount();
	}
	roots.clear();
}

export function renderAllStates() {
	const context = SillyTavern.getContext() as STContext;

	// Reset time tracker first
	resetTimeTracker();

	// Find most recent message with state and initialize time tracker
	for (let i = context.chat.length - 1; i >= 0; i--) {
		const msg = context.chat[i];
		const stored = getMessageState(msg);
		if (stored?.state?.time) {
			setTimeTrackerState(stored.state.time);
			break;
		}
	}

	// Unmount all roots and clear DOM containers
	unmountAllRoots();

	// Re-render all messages
	for (let i = 0; i < context.chat.length; i++) {
		renderMessageState(i);
	}
}

async function editMessageState(messageId: number): Promise<void> {
	const context = SillyTavern.getContext() as STContext;
	const message = context.chat[messageId];

	if (!message) {
		st_echo?.('error', 'Message not found');
		return;
	}

	const currentStateData = getMessageState(message);
	const currentState = currentStateData?.state || null;

	const _saved = await openStateEditor(currentState, async (newState: TrackedState) => {
		const stateData = {
			state: newState,
			extractedAt: new Date().toISOString(),
		};

		setMessageState(message, stateData);
		await context.saveChat();

		renderMessageState(messageId, stateData);
		updateInjectionFromChat();

		st_echo?.('success', '🔥 State updated');
	});
}

export function initStateDisplay() {
	const context = SillyTavern.getContext();

	// Wire up extraction progress updates
	onExtractionProgress((progress: ExtractionProgress) => {
		currentExtractionStep = progress.step;

		// Re-render the extracting message to show updated step
		if (
			currentExtractionMessageId !== null &&
			extractionInProgress.has(currentExtractionMessageId)
		) {
			const messageElement = document.querySelector(
				`[mesid="${currentExtractionMessageId}"]`,
			);
			if (messageElement) {
				renderMessageStateInternal(
					currentExtractionMessageId,
					messageElement,
					null,
					true,
					progress.step,
				);
			}
		}
	});

	// Only handle chat change for initial render - let index.ts handle message events
	context.eventSource.on(context.event_types.CHAT_CHANGED, (() => {
		resetTimeTracker();
		setTimeout(renderAllStates, 100);
	}) as (...args: unknown[]) => void);
}

export function injectStyles() {
	if (document.getElementById('blazetracker-styles')) return;

	const link = document.createElement('link');
	link.id = 'blazetracker-styles';
	link.rel = 'stylesheet';
	link.href = new URL('./stateDisplay.css', import.meta.url).href;
	document.head.appendChild(link);
}
