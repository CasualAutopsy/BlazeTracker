// ============================================
// Event Editor Component
// ============================================

import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import type {
	TimestampedEvent,
	EventType,
	TensionLevel,
	TensionType,
	MilestoneEvent,
	MilestoneType,
} from '../../types/state';
import { EVENT_TYPES, TENSION_LEVELS, TENSION_TYPES, MILESTONE_TYPES } from '../../types/state';
import { TagInput } from './form/TagInput';

// ============================================
// Types
// ============================================

export interface EventEditorProps {
	event: TimestampedEvent;
	onSave: (event: TimestampedEvent) => void;
	onCancel: () => void;
}

export interface EventEditorHandle {
	/** Get the current edited event state */
	getCurrentState: () => TimestampedEvent;
}

// ============================================
// Component
// ============================================

export const EventEditor = forwardRef<EventEditorHandle, EventEditorProps>(function EventEditor(
	{ event, onSave, onCancel },
	ref,
) {
	const [summary, setSummary] = useState(event.summary);
	const [eventTypes, setEventTypes] = useState<EventType[]>(
		event.eventTypes || ['conversation'],
	);
	const [tensionLevel, setTensionLevel] = useState<TensionLevel>(event.tensionLevel);
	const [tensionType, setTensionType] = useState<TensionType>(event.tensionType);
	const [witnesses, setWitnesses] = useState<string[]>(event.witnesses || []);

	// Relationship signal state
	const [hasPair, setHasPair] = useState(!!event.relationshipSignal?.pair);
	const [pairChar1, setPairChar1] = useState(event.relationshipSignal?.pair?.[0] || '');
	const [pairChar2, setPairChar2] = useState(event.relationshipSignal?.pair?.[1] || '');
	const [milestones, setMilestones] = useState<MilestoneEvent[]>(
		event.relationshipSignal?.milestones || [],
	);

	// New milestone form state
	const [newMilestoneType, setNewMilestoneType] = useState<MilestoneType>('first_meeting');
	const [newMilestoneDesc, setNewMilestoneDesc] = useState('');

	/** Build the current edited event from state */
	const buildCurrentEvent = useCallback((): TimestampedEvent => {
		const updatedEvent: TimestampedEvent = {
			...event,
			summary,
			eventTypes,
			tensionLevel,
			tensionType,
			witnesses,
		};

		// Update relationship signal
		if (hasPair && pairChar1 && pairChar2) {
			const sortedPair = [pairChar1, pairChar2].sort() as [string, string];
			updatedEvent.relationshipSignal = {
				pair: sortedPair,
				milestones: milestones.length > 0 ? milestones : undefined,
			};
		} else {
			updatedEvent.relationshipSignal = undefined;
		}

		return updatedEvent;
	}, [
		event,
		summary,
		eventTypes,
		tensionLevel,
		tensionType,
		witnesses,
		hasPair,
		pairChar1,
		pairChar2,
		milestones,
	]);

	// Expose getCurrentState method via ref
	useImperativeHandle(
		ref,
		() => ({
			getCurrentState: buildCurrentEvent,
		}),
		[buildCurrentEvent],
	);

	const handleSave = () => {
		onSave(buildCurrentEvent());
	};

	const handleAddMilestone = () => {
		if (newMilestoneType) {
			const newMilestone: MilestoneEvent = {
				type: newMilestoneType,
				description: newMilestoneDesc,
				timestamp: event.timestamp,
				location: event.location,
				messageId: event.messageId,
			};
			setMilestones([...milestones, newMilestone]);
			setNewMilestoneType('first_meeting');
			setNewMilestoneDesc('');
		}
	};

	const handleRemoveMilestone = (index: number) => {
		setMilestones(milestones.filter((_, i) => i !== index));
	};

	const handleToggleEventType = (type: EventType) => {
		if (eventTypes.includes(type)) {
			// Don't allow removing the last event type
			if (eventTypes.length > 1) {
				setEventTypes(eventTypes.filter(t => t !== type));
			}
		} else {
			setEventTypes([...eventTypes, type]);
		}
	};

	return (
		<div className="bt-event-editor">
			{/* Summary */}
			<div className="bt-editor-field">
				<label htmlFor="event-summary">Summary</label>
				<textarea
					id="event-summary"
					value={summary}
					onChange={e => setSummary(e.target.value)}
					rows={2}
					placeholder="Event summary..."
				/>
			</div>

			{/* Event Types */}
			<div className="bt-editor-field">
				<label>Event Types</label>
				<div className="bt-event-type-grid">
					{EVENT_TYPES.map(type => (
						<label key={type} className="bt-event-type-option">
							<input
								type="checkbox"
								checked={eventTypes.includes(type)}
								onChange={() =>
									handleToggleEventType(type)
								}
							/>
							<span>{type.replace(/_/g, ' ')}</span>
						</label>
					))}
				</div>
			</div>

			{/* Tension */}
			<div className="bt-editor-row">
				<div className="bt-editor-field">
					<label htmlFor="tension-level">Tension Level</label>
					<select
						id="tension-level"
						value={tensionLevel}
						onChange={e =>
							setTensionLevel(
								e.target.value as TensionLevel,
							)
						}
					>
						{TENSION_LEVELS.map(level => (
							<option key={level} value={level}>
								{level}
							</option>
						))}
					</select>
				</div>

				<div className="bt-editor-field">
					<label htmlFor="tension-type">Tension Type</label>
					<select
						id="tension-type"
						value={tensionType}
						onChange={e =>
							setTensionType(
								e.target.value as TensionType,
							)
						}
					>
						{TENSION_TYPES.map(type => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Witnesses */}
			<div className="bt-editor-field">
				<label>Witnesses</label>
				<TagInput
					tags={witnesses}
					onChange={setWitnesses}
					placeholder="Add witness..."
				/>
			</div>

			{/* Relationship Signal */}
			<div className="bt-editor-section">
				<label className="bt-section-toggle">
					<input
						type="checkbox"
						checked={hasPair}
						onChange={e => setHasPair(e.target.checked)}
					/>
					<span>Relationship Signal</span>
				</label>

				{hasPair && (
					<div className="bt-relationship-signal-editor">
						<div className="bt-editor-row">
							<div className="bt-editor-field">
								<label htmlFor="pair-char1">
									Character 1
								</label>
								<input
									id="pair-char1"
									type="text"
									value={pairChar1}
									onChange={e =>
										setPairChar1(
											e.target
												.value,
										)
									}
									placeholder="Name..."
								/>
							</div>
							<span className="bt-pair-separator">
								&amp;
							</span>
							<div className="bt-editor-field">
								<label htmlFor="pair-char2">
									Character 2
								</label>
								<input
									id="pair-char2"
									type="text"
									value={pairChar2}
									onChange={e =>
										setPairChar2(
											e.target
												.value,
										)
									}
									placeholder="Name..."
								/>
							</div>
						</div>

						{/* Milestones */}
						<div className="bt-milestones-editor">
							<label>Milestones</label>

							{milestones.length > 0 && (
								<ul className="bt-milestones-list-edit">
									{milestones.map((m, i) => (
										<li key={i}>
											<span className="bt-milestone-type">
												{m.type.replace(
													/_/g,
													' ',
												)}
											</span>
											{m.description && (
												<span className="bt-milestone-desc">
													{
														m.description
													}
												</span>
											)}
											<button
												type="button"
												className="bt-delete-btn-small"
												onClick={() =>
													handleRemoveMilestone(
														i,
													)
												}
												title="Remove milestone"
											>
												<i className="fa-solid fa-times"></i>
											</button>
										</li>
									))}
								</ul>
							)}

							<div className="bt-add-milestone">
								<select
									value={newMilestoneType}
									onChange={e =>
										setNewMilestoneType(
											e.target
												.value as MilestoneType,
										)
									}
								>
									{MILESTONE_TYPES.map(
										type => (
											<option
												key={
													type
												}
												value={
													type
												}
											>
												{type.replace(
													/_/g,
													' ',
												)}
											</option>
										),
									)}
								</select>
								<input
									type="text"
									value={newMilestoneDesc}
									onChange={e =>
										setNewMilestoneDesc(
											e.target
												.value,
										)
									}
									placeholder="Description (optional)..."
								/>
								<button
									type="button"
									className="bt-btn bt-btn-small"
									onClick={handleAddMilestone}
								>
									<i className="fa-solid fa-plus"></i>
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Actions */}
			<div className="bt-editor-actions">
				<button
					type="button"
					className="bt-btn bt-btn-secondary"
					onClick={onCancel}
				>
					Cancel
				</button>
				<button
					type="button"
					className="bt-btn bt-btn-primary"
					onClick={handleSave}
				>
					Save
				</button>
			</div>
		</div>
	);
});
