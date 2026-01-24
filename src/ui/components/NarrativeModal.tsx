// ============================================
// Narrative Modal Component
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { NarrativeState, TimestampedEvent, Chapter, Relationship } from '../../types/state';
import { ChapterHistory } from './ChapterHistory';
import { TensionGraph } from './TensionGraph';
import { EventList, type EventListHandle } from './EventList';
import { RelationshipsTab } from '../tabs/RelationshipsTab';

// ============================================
// Types
// ============================================

export type TabId = 'events' | 'chapters' | 'relationships';

/** Info about deleted events for syncing with message state */
export interface DeletedEventInfo {
	messageId: number;
	summary: string;
}

export interface NarrativeModalProps {
	narrativeState: NarrativeState;
	currentEvents?: TimestampedEvent[];
	presentCharacters?: string[];
	onClose: () => void;
	onSave?: (
		state: NarrativeState,
		deletedEvents: DeletedEventInfo[],
		updatedCurrentEvents?: TimestampedEvent[],
	) => Promise<void>;
	initialTab?: TabId;
}

// ============================================
// Component
// ============================================

export function NarrativeModal({
	narrativeState,
	currentEvents = [],
	presentCharacters,
	onClose,
	onSave,
	initialTab = 'chapters',
}: NarrativeModalProps) {
	const [activeTab, setActiveTab] = useState<TabId>(initialTab);
	const [editMode, setEditMode] = useState(false);
	const [saving, setSaving] = useState(false);

	// Ref to access EventList's pending edit state
	const eventListRef = useRef<EventListHandle>(null);

	// Working copies for edit mode
	const [editChapters, setEditChapters] = useState<Chapter[]>([]);
	const [editRelationships, setEditRelationships] = useState<Relationship[]>([]);
	const [editCurrentEvents, setEditCurrentEvents] = useState<TimestampedEvent[]>([]);

	// Track deleted events for syncing back to messages
	const [deletedEvents, setDeletedEvents] = useState<DeletedEventInfo[]>([]);

	// Initialize edit state when entering edit mode
	const enterEditMode = useCallback(() => {
		setEditChapters(JSON.parse(JSON.stringify(narrativeState.chapters)));
		setEditRelationships(JSON.parse(JSON.stringify(narrativeState.relationships)));
		setEditCurrentEvents(JSON.parse(JSON.stringify(currentEvents)));
		setDeletedEvents([]);
		setEditMode(true);
	}, [narrativeState, currentEvents]);

	const cancelEditMode = useCallback(() => {
		setEditMode(false);
		setEditChapters([]);
		setEditRelationships([]);
		setEditCurrentEvents([]);
		setDeletedEvents([]);
	}, []);

	const handleSave = useCallback(async () => {
		if (!onSave) return;

		// Get any pending event edits and apply them directly
		// (we can't rely on setState being synchronous)
		let finalCurrentEvents = editCurrentEvents;
		const pendingEdit = eventListRef.current?.getPendingEdit();
		if (pendingEdit) {
			finalCurrentEvents = [...editCurrentEvents];
			finalCurrentEvents[pendingEdit.index] = pendingEdit.event;
		}

		setSaving(true);
		try {
			const updatedState: NarrativeState = {
				...narrativeState,
				chapters: editChapters,
				relationships: editRelationships,
			};
			await onSave(updatedState, deletedEvents, finalCurrentEvents);
			setEditMode(false);
		} finally {
			setSaving(false);
		}
	}, [
		onSave,
		narrativeState,
		editChapters,
		editRelationships,
		editCurrentEvents,
		deletedEvents,
	]);

	// Handle chapter updates
	const handleChaptersUpdate = useCallback(
		(chapters: Chapter[]) => {
			// Track deleted events from chapters
			const newChapterEventIds = new Set(
				chapters.flatMap(ch =>
					ch.events.map(e => `${e.messageId}-${e.summary}`),
				),
			);
			const oldEvents = editChapters.flatMap(ch => ch.events);
			for (const event of oldEvents) {
				if (
					!newChapterEventIds.has(
						`${event.messageId}-${event.summary}`,
					)
				) {
					if (event.messageId !== undefined) {
						setDeletedEvents(prev => [
							...prev,
							{
								messageId: event.messageId!,
								summary: event.summary,
							},
						]);
					}
				}
			}
			setEditChapters(chapters);
		},
		[editChapters],
	);

	// Handle current events updates
	const handleCurrentEventUpdate = useCallback(
		(index: number, event: TimestampedEvent) => {
			const newEvents = [...editCurrentEvents];
			newEvents[index] = event;
			setEditCurrentEvents(newEvents);
		},
		[editCurrentEvents],
	);

	const handleCurrentEventDelete = useCallback(
		(index: number) => {
			const event = editCurrentEvents[index];
			if (event.messageId !== undefined) {
				setDeletedEvents(prev => [
					...prev,
					{ messageId: event.messageId!, summary: event.summary },
				]);
			}
			setEditCurrentEvents(editCurrentEvents.filter((_, i) => i !== index));
		},
		[editCurrentEvents],
	);

	// Close on escape key (only if not in edit mode)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && !editMode) {
				onClose();
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose, editMode]);

	// Prevent scrolling of body while modal is open
	useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	}, []);

	// Use edit state or original state based on mode
	const displayChapters = editMode ? editChapters : narrativeState.chapters;
	const displayRelationships = editMode ? editRelationships : narrativeState.relationships;
	const displayCurrentEvents = editMode ? editCurrentEvents : currentEvents;

	// Get all events from all chapters
	const allChapterEvents = displayChapters.flatMap(ch => ch.events);
	// All events for tension graph (including current)
	const allEvents = [...allChapterEvents, ...displayCurrentEvents];

	// Render to body via portal to avoid container positioning issues
	return createPortal(
		<div
			className="bt-modal-overlay"
			onClick={e => {
				if (e.target === e.currentTarget && !editMode) onClose();
			}}
		>
			<div className="bt-modal-container bt-narrative-modal">
				{/* Header */}
				<div className="bt-modal-header">
					<h2>
						{editMode
							? 'Editing Narrative'
							: 'Narrative Overview'}
					</h2>
					<div className="bt-modal-header-actions">
						{editMode ? (
							<>
								<button
									className="bt-btn bt-btn-secondary"
									onClick={cancelEditMode}
									disabled={saving}
								>
									Cancel
								</button>
								<button
									className="bt-btn bt-btn-primary"
									onClick={handleSave}
									disabled={saving}
								>
									{saving ? (
										<>
											<i className="fa-solid fa-spinner fa-spin"></i>
											Saving...
										</>
									) : (
										<>
											<i className="fa-solid fa-check"></i>
											Save
										</>
									)}
								</button>
							</>
						) : (
							onSave && (
								<button
									className="bt-btn bt-btn-secondary"
									onClick={enterEditMode}
									title="Enable editing of narrative state"
								>
									<i className="fa-solid fa-pen"></i>
									Enable Editing
								</button>
							)
						)}
						<button
							className="bt-modal-close"
							onClick={onClose}
							disabled={editMode}
						>
							<i className="fa-solid fa-xmark"></i>
						</button>
					</div>
				</div>

				{/* Tabs */}
				<div className="bt-modal-tabs">
					<button
						className={`bt-tab ${activeTab === 'events' ? 'bt-tab-active' : ''}`}
						onClick={() => setActiveTab('events')}
					>
						<i className="fa-solid fa-bolt"></i>
						<span>Events ({displayCurrentEvents.length})</span>
					</button>
					<button
						className={`bt-tab ${activeTab === 'chapters' ? 'bt-tab-active' : ''}`}
						onClick={() => setActiveTab('chapters')}
					>
						<i className="fa-solid fa-book"></i>
						<span>Chapters ({displayChapters.length})</span>
					</button>
					<button
						className={`bt-tab ${activeTab === 'relationships' ? 'bt-tab-active' : ''}`}
						onClick={() => setActiveTab('relationships')}
					>
						<i className="fa-solid fa-heart"></i>
						<span>
							Relationships ({displayRelationships.length}
							)
						</span>
					</button>
				</div>

				{/* Tab Content */}
				<div className="bt-modal-content">
					{activeTab === 'events' && (
						<div className="bt-events-tab-content">
							{displayCurrentEvents.length > 0 ? (
								<EventList
									ref={eventListRef}
									events={
										displayCurrentEvents
									}
									presentCharacters={
										presentCharacters
									}
									editMode={editMode}
									onUpdate={
										handleCurrentEventUpdate
									}
									onDelete={
										handleCurrentEventDelete
									}
								/>
							) : (
								<p className="bt-empty-message">
									No events in the current
									chapter yet.
								</p>
							)}
						</div>
					)}

					{activeTab === 'chapters' && (
						<div className="bt-chapters-tab-content">
							{/* Tension Graph (if there are events) */}
							{allEvents.length > 0 && !editMode && (
								<div className="bt-tension-graph-section">
									<h3>
										<i className="fa-solid fa-chart-line"></i>
										Tension Over Time
									</h3>
									<TensionGraph
										events={allEvents}
									/>
								</div>
							)}

							{/* Chapter History */}
							<ChapterHistory
								chapters={displayChapters}
								editMode={editMode}
								onUpdate={handleChaptersUpdate}
							/>
						</div>
					)}

					{activeTab === 'relationships' && (
						<RelationshipsTab
							relationships={displayRelationships}
							presentCharacters={presentCharacters}
							editMode={editMode}
							onUpdate={setEditRelationships}
						/>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
}
