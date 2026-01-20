import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { settingsManager, type BlazeTrackerSettings, updateSetting, getSettings } from '../settings';
import { renderAllStates } from './stateDisplay';
import {
  getAllPromptDefinitions,
  getPrompt,
  isPromptCustomized,
  type PromptKey,
  type PromptDefinition
} from '../extractors/prompts';

// ============================================
// Types
// ============================================

interface ConnectionProfile {
  id: string;
  name?: string;
}

// ============================================
// Sub-components
// ============================================

interface SelectFieldProps {
  id: string;
  label: string;
  description: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function SelectField({ id, label, description, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="flex-container flexFlowColumn">
      <label htmlFor={id}>{label}</label>
      <small>{description}</small>
      <select
        id={id}
        className="text_pole"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function NumberField({ id, label, description, value, min, max, step, onChange }: NumberFieldProps) {
  return (
    <div className="flex-container flexFlowColumn">
      <label htmlFor={id}>{label}</label>
      <small>{description}</small>
      <input
        type="number"
        id={id}
        className="text_pole"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || min)}
      />
    </div>
  );
}

interface CheckboxFieldProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckboxField({ id, label, description, checked, onChange }: CheckboxFieldProps) {
  return (
    <div className="flex-container flexFlowColumn">
      <label className="checkbox_label">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      <small>{description}</small>
    </div>
  );
}

// ============================================
// Prompt Editor Component
// ============================================

interface PromptEditorProps {
  definition: PromptDefinition;
  customPrompts: Record<string, string>;
  onSave: (key: PromptKey, value: string | null) => void;
}

function PromptEditor({ definition, customPrompts, onSave }: PromptEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const isCustomized = !!customPrompts[definition.key];

  const handleEdit = () => {
    setEditValue(customPrompts[definition.key] || definition.default);
    setIsEditing(true);
  };

  const handleSave = () => {
    // If unchanged from default, remove customization
    if (editValue.trim() === definition.default.trim()) {
      onSave(definition.key, null);
    } else {
      onSave(definition.key, editValue);
    }
    setIsEditing(false);
  };

  const handleReset = () => {
    onSave(definition.key, null);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bt-prompt-editor">
        <div className="bt-prompt-editor-header">
          <strong>{definition.name}</strong>
          <span className="bt-prompt-description">{definition.description}</span>
        </div>

        <div className="bt-prompt-placeholders">
          <strong>Available placeholders:</strong>
          <ul>
            {definition.placeholders.map(p => (
              <li key={p.name}>
                <code>{p.name}</code> — {p.description}
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
            <i className="fa-solid fa-rotate-left"></i> Reset to Default
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
        {isCustomized && (
          <span className="bt-prompt-customized" title="Custom prompt">
            <i className="fa-solid fa-pen"></i>
          </span>
        )}
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
  onUpdatePrompt: (key: PromptKey, value: string | null) => void;
}

function PromptsSection({ customPrompts, onUpdatePrompt }: PromptsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const definitions = getAllPromptDefinitions();

  const customizedCount = definitions.filter(d => !!customPrompts[d.key]).length;

  return (
    <div className="bt-prompts-section">
      <div
        className="bt-prompts-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="bt-prompts-title">
          <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
          <strong>Custom Prompts</strong>
          {customizedCount > 0 && (
            <span className="bt-prompts-count">({customizedCount} customized)</span>
          )}
        </div>
        <small>Click to customize extraction prompts for different models</small>
      </div>

      {isExpanded && (
        <div className="bt-prompts-list">
          {definitions.map(def => (
            <PromptEditor
              key={def.key}
              definition={def}
              customPrompts={customPrompts}
              onSave={onUpdatePrompt}
            />
          ))}
        </div>
      )}
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
    const connectionManager = context.extensionSettings?.connectionManager as {
      profiles?: ConnectionProfile[]
    } | undefined;
    setProfiles(connectionManager?.profiles || []);
  }, []);

  const handleUpdate = useCallback(<K extends keyof BlazeTrackerSettings>(
    key: K,
    value: BlazeTrackerSettings[K]
  ) => {
    updateSetting(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handlePositionChange = useCallback((value: string) => {
    handleUpdate('displayPosition', value as 'above' | 'below');
    document.querySelectorAll('.bt-state-root').forEach(el => el.remove());
    setTimeout(() => renderAllStates(), 200);
  }, [handleUpdate]);

  const handleTrackTimeChange = useCallback((checked: boolean) => {
    handleUpdate('trackTime', checked);
    setTimeout(() => renderAllStates(), 100);
  }, [handleUpdate]);

  const handleTempUnitChange = useCallback((value: string) => {
    handleUpdate('temperatureUnit', value as 'fahrenheit' | 'celsius');
    setTimeout(() => renderAllStates(), 100);
  }, [handleUpdate]);

  const handleTimeFormatChange = useCallback((value: string) => {
    handleUpdate('timeFormat', value as '12h' | '24h');
    setTimeout(() => renderAllStates(), 100);
  }, [handleUpdate]);

  const handlePromptUpdate = useCallback((key: PromptKey, value: string | null) => {
    const newCustomPrompts = { ...settings.customPrompts };
    if (value === null) {
      delete newCustomPrompts[key];
    } else {
      newCustomPrompts[key] = value;
    }
    handleUpdate('customPrompts', newCustomPrompts);
  }, [settings.customPrompts, handleUpdate]);

  return (
    <div className="blazetracker-settings-content">
      {/* Connection Profile */}
      <div className="flex-container flexFlowColumn">
        <label htmlFor="blazetracker-profile">Connection Profile</label>
        <small>Select which API connection to use for state extraction</small>
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
        onChange={v => handleUpdate('autoMode', v as BlazeTrackerSettings['autoMode'])}
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

      {/* Time Tracking */}
      <CheckboxField
        id="blazetracker-tracktime"
        label="Enable Time Tracking"
        description="Extract and track narrative date/time (requires additional LLM call per message)"
        checked={settings.trackTime}
        onChange={handleTrackTimeChange}
      />

      {settings.trackTime && (
        <NumberField
          id="blazetracker-leapthreshold"
          label="Leap Threshold (minutes)"
          description="Cap consecutive time jumps to prevent 'double sleep' issues"
          value={settings.leapThresholdMinutes}
          min={5}
          max={1440}
          step={5}
          onChange={v => handleUpdate('leapThresholdMinutes', v)}
        />
      )}

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
        onUpdatePrompt={handlePromptUpdate}
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

  console.log('[BlazeTracker] Settings UI initialized');
}

export function unmountSettingsUI() {
  if (settingsRoot) {
    settingsRoot.unmount();
    settingsRoot = null;
  }
}
