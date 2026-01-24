import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
	settingsManager,
	type BlazeTrackerSettings,
	updateSetting,
	getSettings,
} from '../settings';
import { renderAllStates } from './stateDisplay';
import {
	getAllPromptDefinitions,
	type PromptKey,
	type PromptDefinition,
} from '../extractors/prompts';
import { SelectField, NumberField, CheckboxField } from './components/form';

// ============================================
// Types
// ============================================

interface ConnectionProfile {
	id: string;
	name?: string;
}

// ============================================
// Prompt Editor Component
// ============================================

interface PromptEditorProps {
	definition: PromptDefinition;
	customPrompts: Record<string, string>;
	customTemperatures: Record<string, number>;
	onSave: (key: PromptKey, value: string | null) => void;
	onSaveTemperature: (key: PromptKey, value: number | null) => void;
}

function PromptEditor({
	definition,
	customPrompts,
	customTemperatures,
	onSave,
	onSaveTemperature,
}: PromptEditorProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editValue, setEditValue] = useState('');
	const [editTemperature, setEditTemperature] = useState(definition.defaultTemperature);

	// Defensive: customTemperatures may be undefined for existing users
	const temps = customTemperatures ?? {};
	const isPromptCustomized = !!customPrompts[definition.key];
	const isTemperatureCustomized = definition.key in temps;
	const currentTemperature = temps[definition.key] ?? definition.defaultTemperature;

	const handleEdit = () => {
		setEditValue(customPrompts[definition.key] || definition.default);
		setEditTemperature(currentTemperature);
		setIsEditing(true);
	};

	const handleSave = () => {
		// If unchanged from default, remove customization
		if (editValue.trim() === definition.default.trim()) {
			onSave(definition.key, null);
		} else {
			onSave(definition.key, editValue);
		}

		// Same for temperature
		if (editTemperature === definition.defaultTemperature) {
			onSaveTemperature(definition.key, null);
		} else {
			onSaveTemperature(definition.key, editTemperature);
		}

		setIsEditing(false);
	};

	const handleReset = () => {
		onSave(definition.key, null);
		onSaveTemperature(definition.key, null);
		setIsEditing(false);
	};

	const handleCancel = () => {
		setIsEditing(false);
	};

	const handleTemperatureInput = (value: string) => {
		const num = parseFloat(value);
		if (!isNaN(num)) {
			setEditTemperature(Math.max(0, Math.min(2, num)));
		}
	};

	if (isEditing) {
		return (
			<div className="bt-prompt-editor">
				<div className="bt-prompt-editor-header">
					<strong>{definition.name}</strong>
					<span className="bt-prompt-description">
						{definition.description}
					</span>
				</div>

				<div className="bt-temperature-control">
					<label className="bt-temperature-label">
						<span>Temperature:</span>
						<input
							type="range"
							className="bt-temperature-slider"
							min="0"
							max="2"
							step="0.05"
							value={editTemperature}
							onChange={e =>
								setEditTemperature(
									parseFloat(e.target.value),
								)
							}
						/>
						<input
							type="number"
							className="bt-temperature-input"
							min="0"
							max="2"
							step="0.05"
							value={editTemperature}
							onChange={e =>
								handleTemperatureInput(
									e.target.value,
								)
							}
						/>
						<span className="bt-temperature-default">
							(default: {definition.defaultTemperature})
						</span>
					</label>
				</div>

				<div className="bt-prompt-placeholders">
					<strong>Available placeholders:</strong>
					<ul>
						{definition.placeholders.map(p => (
							<li key={p.name}>
								<code>{p.name}</code> —{' '}
								{p.description}
							</li>
						))}
					</ul>
				</div>

				<textarea
					className="text_pole bt-prompt-textarea"
					value={editValue}
					onChange={e => setEditValue(e.target.value)}
					rows={15}
				/>

				<div className="bt-prompt-actions">
					<button className="menu_button" onClick={handleSave}>
						<i className="fa-solid fa-check"></i> Save
					</button>
					<button className="menu_button" onClick={handleReset}>
						<i className="fa-solid fa-rotate-left"></i> Reset to
						Default
					</button>
					<button className="menu_button" onClick={handleCancel}>
						<i className="fa-solid fa-xmark"></i> Cancel
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="bt-prompt-item" onClick={handleEdit}>
			<div className="bt-prompt-item-header">
				<span className="bt-prompt-name">{definition.name}</span>
				<div className="bt-prompt-badges">
					{isTemperatureCustomized && (
						<span
							className="bt-prompt-temperature-badge"
							title={`Custom temperature: ${currentTemperature}`}
						>
							<i className="fa-solid fa-temperature-half"></i>{' '}
							{currentTemperature}
						</span>
					)}
					{isPromptCustomized && (
						<span
							className="bt-prompt-customized"
							title="Custom prompt"
						>
							<i className="fa-solid fa-pen"></i>
						</span>
					)}
				</div>
			</div>
			<small className="bt-prompt-description">{definition.description}</small>
		</div>
	);
}

// ============================================
// Prompts Section Component
// ============================================

interface PromptsSectionProps {
	customPrompts: Record<string, string>;
	customTemperatures: Record<string, number>;
	onUpdatePrompt: (key: PromptKey, value: string | null) => void;
	onUpdateTemperature: (key: PromptKey, value: number | null) => void;
}

function PromptsSection({
	customPrompts,
	customTemperatures,
	onUpdatePrompt,
	onUpdateTemperature,
}: PromptsSectionProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const definitions = getAllPromptDefinitions();

	return (
		<div className="bt-prompts-section">
			<div
				className="bt-prompts-header"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<span>
					<i
						className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`}
					></i>{' '}
					Custom Prompts
				</span>
				<small>Click to customize extraction prompts</small>
			</div>

			{isExpanded && (
				<div className="bt-prompts-list">
					{definitions.map(def => (
						<PromptEditor
							key={def.key}
							definition={def}
							customPrompts={customPrompts}
							customTemperatures={customTemperatures}
							onSave={onUpdatePrompt}
							onSaveTemperature={onUpdateTemperature}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ============================================
// Extraction Toggles Section
// ============================================

// Keys that are boolean toggles in extraction settings
type BooleanSettingKey =
	| 'trackTime'
	| 'trackLocation'
	| 'trackClimate'
	| 'trackCharacters'
	| 'trackScene'
	| 'useProceduralWeather'
	| 'injectWeatherTransitions';
// Keys that are numeric settings in extraction settings
type NumericSettingKey = 'leapThresholdMinutes';

interface ExtractionTogglesSectionProps {
	settings: BlazeTrackerSettings;
	onToggle: (key: BooleanSettingKey, value: boolean) => void;
	onNumericChange: (key: NumericSettingKey, value: number) => void;
}

function ExtractionTogglesSection({
	settings,
	onToggle,
	onNumericChange,
}: ExtractionTogglesSectionProps) {
	return (
		<div className="bt-extraction-toggles">
			<div className="bt-section-header">
				<strong>Extraction Types</strong>
				<small>Enable or disable specific extraction modules</small>
			</div>

			<CheckboxField
				id="blazetracker-tracktime"
				label="Time Tracking"
				description="Extract and track narrative date/time"
				checked={settings.trackTime}
				onChange={checked => onToggle('trackTime', checked)}
			/>

			{settings.trackTime && (
				<div className="bt-nested-setting">
					<NumberField
						id="blazetracker-leapthreshold"
						label="Leap Threshold (minutes)"
						description="Cap consecutive time jumps to prevent 'double sleep' issues"
						value={settings.leapThresholdMinutes}
						min={5}
						max={1440}
						step={5}
						onChange={v =>
							onNumericChange('leapThresholdMinutes', v)
						}
					/>
				</div>
			)}

			<CheckboxField
				id="blazetracker-tracklocation"
				label="Location Tracking"
				description="Extract area, place, position, and nearby props"
				checked={settings.trackLocation}
				onChange={checked => onToggle('trackLocation', checked)}
			/>

			<CheckboxField
				id="blazetracker-trackclimate"
				label="Climate Tracking"
				description="Extract weather and temperature conditions"
				checked={settings.trackClimate}
				onChange={checked => onToggle('trackClimate', checked)}
			/>

			{settings.trackClimate && (
				<div className="bt-nested-setting">
					<CheckboxField
						id="blazetracker-proceduralweather"
						label="Procedural Weather"
						description="Use procedural forecast generation instead of LLM extraction"
						checked={settings.useProceduralWeather}
						onChange={checked =>
							onToggle(
								'useProceduralWeather' as BooleanSettingKey,
								checked,
							)
						}
					/>
					{settings.useProceduralWeather && (
						<div className="bt-nested-setting">
							<CheckboxField
								id="blazetracker-weathertransitions"
								label="Weather Transitions"
								description="Inject transition notes when weather changes significantly"
								checked={
									settings.injectWeatherTransitions
								}
								onChange={checked =>
									onToggle(
										'injectWeatherTransitions' as BooleanSettingKey,
										checked,
									)
								}
							/>
						</div>
					)}
				</div>
			)}

			<CheckboxField
				id="blazetracker-trackcharacters"
				label="Character Tracking"
				description="Extract character positions, moods, outfits, and dispositions"
				checked={settings.trackCharacters}
				onChange={checked => onToggle('trackCharacters', checked)}
			/>

			<CheckboxField
				id="blazetracker-trackscene"
				label="Scene Tracking"
				description="Extract scene topic, tone, tension, and recent events"
				checked={settings.trackScene}
				onChange={checked => onToggle('trackScene', checked)}
			/>
		</div>
	);
}

// ============================================
// Main Settings Panel Component
// ============================================

function SettingsPanel() {
	const [settings, setSettings] = useState<BlazeTrackerSettings>(getSettings);
	const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);

	// Load connection profiles
	useEffect(() => {
		const context = SillyTavern.getContext();
		const connectionManager = context.extensionSettings?.connectionManager as
			| {
					profiles?: ConnectionProfile[];
			  }
			| undefined;
		setProfiles(connectionManager?.profiles || []);
	}, []);

	const handleUpdate = useCallback(
		<K extends keyof BlazeTrackerSettings>(key: K, value: BlazeTrackerSettings[K]) => {
			updateSetting(key, value);
			setSettings(prev => ({ ...prev, [key]: value }));
		},
		[],
	);

	const handlePositionChange = useCallback(
		(value: string) => {
			handleUpdate('displayPosition', value as 'above' | 'below');
			document.querySelectorAll('.bt-state-root').forEach(el => el.remove());
			setTimeout(() => renderAllStates(), 200);
		},
		[handleUpdate],
	);

	// Handler for boolean extraction toggles
	const handleExtractionToggle = useCallback(
		(key: BooleanSettingKey, value: boolean) => {
			handleUpdate(key, value);
			setTimeout(() => renderAllStates(), 100);
		},
		[handleUpdate],
	);

	// Handler for numeric extraction settings
	const handleExtractionNumericChange = useCallback(
		(key: NumericSettingKey, value: number) => {
			handleUpdate(key, value);
		},
		[handleUpdate],
	);

	const handleTempUnitChange = useCallback(
		(value: string) => {
			handleUpdate('temperatureUnit', value as 'fahrenheit' | 'celsius');
			setTimeout(() => renderAllStates(), 100);
		},
		[handleUpdate],
	);

	const handleTimeFormatChange = useCallback(
		(value: string) => {
			handleUpdate('timeFormat', value as '12h' | '24h');
			setTimeout(() => renderAllStates(), 100);
		},
		[handleUpdate],
	);

	const handlePromptUpdate = useCallback(
		(key: PromptKey, value: string | null) => {
			const newCustomPrompts = { ...(settings.customPrompts ?? {}) };
			if (value === null) {
				delete newCustomPrompts[key];
			} else {
				newCustomPrompts[key] = value;
			}
			handleUpdate('customPrompts', newCustomPrompts);
		},
		[settings.customPrompts, handleUpdate],
	);

	const handleTemperatureUpdate = useCallback(
		(key: PromptKey, value: number | null) => {
			const newCustomTemperatures = { ...(settings.customTemperatures ?? {}) };
			if (value === null) {
				delete newCustomTemperatures[key];
			} else {
				newCustomTemperatures[key] = value;
			}
			handleUpdate('customTemperatures', newCustomTemperatures);
		},
		[settings.customTemperatures, handleUpdate],
	);

	return (
		<div className="blazetracker-settings-content">
			{/* Connection Profile */}
			<div className="flex-container flexFlowColumn">
				<label htmlFor="blazetracker-profile">Connection Profile</label>
				<small>
					Select which API connection to use for state extraction
				</small>
				<select
					id="blazetracker-profile"
					className="text_pole"
					value={settings.profileId}
					onChange={e => handleUpdate('profileId', e.target.value)}
				>
					<option value="">-- Select a profile --</option>
					{profiles.map(profile => (
						<option key={profile.id} value={profile.id}>
							{profile.name || profile.id}
						</option>
					))}
				</select>
			</div>

			<hr />

			{/* Auto Mode */}
			<SelectField
				id="blazetracker-automode"
				label="Auto Mode"
				description="When to automatically extract state"
				value={settings.autoMode}
				options={[
					{ value: 'none', label: 'None (manual only)' },
					{ value: 'responses', label: 'AI responses only' },
					{ value: 'inputs', label: 'User messages only' },
					{ value: 'both', label: 'Both' },
				]}
				onChange={v =>
					handleUpdate(
						'autoMode',
						v as BlazeTrackerSettings['autoMode'],
					)
				}
			/>

			<hr />

			{/* Max Messages */}
			<NumberField
				id="blazetracker-lastx"
				label="Max Messages to Include"
				description="Max. number of recent messages to send for extraction context"
				value={settings.lastXMessages}
				min={1}
				max={50}
				step={1}
				onChange={v => handleUpdate('lastXMessages', v)}
			/>

			<hr />

			{/* Max Tokens */}
			<NumberField
				id="blazetracker-maxtokens"
				label="Max Response Tokens"
				description="Maximum tokens for extraction response"
				value={settings.maxResponseTokens}
				min={500}
				max={8000}
				step={100}
				onChange={v => handleUpdate('maxResponseTokens', v)}
			/>

			<hr />

			{/* Display Position */}
			<SelectField
				id="blazetracker-position"
				label="State Display Position"
				description="Show state block above or below the message"
				value={settings.displayPosition}
				options={[
					{ value: 'below', label: 'Below message' },
					{ value: 'above', label: 'Above message' },
				]}
				onChange={handlePositionChange}
			/>

			<hr />

			{/* Extraction Toggles Section */}
			<ExtractionTogglesSection
				settings={settings}
				onToggle={handleExtractionToggle}
				onNumericChange={handleExtractionNumericChange}
			/>

			<hr />

			{/* Relationship Settings */}
			<div className="bt-relationship-settings">
				<div className="bt-section-header">
					<strong>Relationship Settings</strong>
					<small>Configure relationship progression behavior</small>
				</div>

				<NumberField
					id="blazetracker-relationship-cooldown"
					label="Upgrade Cooldown (messages)"
					description="Minimum messages between relationship status upgrades"
					value={settings.relationshipUpgradeCooldown}
					min={1}
					max={20}
					step={1}
					onChange={v =>
						handleUpdate('relationshipUpgradeCooldown', v)
					}
				/>
			</div>

			<hr />

			{/* Temperature Unit */}
			<SelectField
				id="blazetracker-tempunit"
				label="Temperature Unit"
				description="Display temperatures in Fahrenheit or Celsius"
				value={settings.temperatureUnit}
				options={[
					{ value: 'fahrenheit', label: 'Fahrenheit (°F)' },
					{ value: 'celsius', label: 'Celsius (°C)' },
				]}
				onChange={handleTempUnitChange}
			/>

			{/* Time Format */}
			<SelectField
				id="blazetracker-timeformat"
				label="Time Format"
				description="Display time in 12-hour or 24-hour format"
				value={settings.timeFormat}
				options={[
					{ value: '24h', label: '24-hour (14:30)' },
					{ value: '12h', label: '12-hour (2:30 PM)' },
				]}
				onChange={handleTimeFormatChange}
			/>

			<hr />

			{/* Custom Prompts */}
			<PromptsSection
				customPrompts={settings.customPrompts}
				customTemperatures={settings.customTemperatures}
				onUpdatePrompt={handlePromptUpdate}
				onUpdateTemperature={handleTemperatureUpdate}
			/>
		</div>
	);
}

// ============================================
// Initialization
// ============================================

let settingsRoot: ReactDOM.Root | null = null;

function injectSettingsStyles() {
	if (document.getElementById('blazetracker-settings-styles')) return;

	const link = document.createElement('link');
	link.id = 'blazetracker-settings-styles';
	link.rel = 'stylesheet';
	link.href = new URL('./settings.css', import.meta.url).href;
	document.head.appendChild(link);
}

export async function initSettingsUI() {
	const settingsContainer = document.getElementById('extensions_settings');
	if (!settingsContainer) {
		console.error('[BlazeTracker] Extension settings container not found.');
		return;
	}

	// Inject styles
	injectSettingsStyles();

	// Initialize settings
	await settingsManager.initializeSettings();

	// Create wrapper with drawer structure
	const panel = document.createElement('div');
	panel.id = 'blazetracker-settings';
	panel.className = 'extension_container';
	panel.innerHTML = `
    <div class="inline-drawer">
      <div class="inline-drawer-toggle inline-drawer-header">
        <b>🔥 BlazeTracker</b>
        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
      </div>
      <div class="inline-drawer-content">
        <div id="blazetracker-settings-root"></div>
      </div>
    </div>
  `;

	settingsContainer.appendChild(panel);

	// Mount React component
	const root = document.getElementById('blazetracker-settings-root');
	if (root) {
		settingsRoot = ReactDOM.createRoot(root);
		settingsRoot.render(<SettingsPanel />);
	}
}

export function unmountSettingsUI() {
	if (settingsRoot) {
		settingsRoot.unmount();
		settingsRoot = null;
	}
}
