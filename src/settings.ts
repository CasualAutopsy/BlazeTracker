import { ExtensionSettingsManager } from 'sillytavern-utils-lib';
import { EXTENSION_KEY } from './constants';

export interface CustomPrompts {
  [key: string]: string;
}

export interface BlazeTrackerSettings {
  profileId: string;
  autoMode: 'none' | 'responses' | 'inputs' | 'both';
  lastXMessages: number;
  maxResponseTokens: number;
  displayPosition: 'above' | 'below';
  trackTime: boolean;
  leapThresholdMinutes: number;
  temperatureUnit: 'fahrenheit' | 'celsius';
  timeFormat: '12h' | '24h';
  customPrompts: CustomPrompts;
}

export const defaultSettings: BlazeTrackerSettings = {
  profileId: '',
  autoMode: 'both',
  lastXMessages: 10,
  maxResponseTokens: 4000,
  displayPosition: 'below',
  trackTime: true,
  leapThresholdMinutes: 20,
  temperatureUnit: 'fahrenheit',
  timeFormat: '24h',
  customPrompts: {},
};

export const settingsManager = new ExtensionSettingsManager<BlazeTrackerSettings>(
  EXTENSION_KEY,
  defaultSettings
);

export function getSettings(): BlazeTrackerSettings {
  return settingsManager.getSettings();
}

export function updateSetting<K extends keyof BlazeTrackerSettings>(
  key: K,
  value: BlazeTrackerSettings[K]
): void {
  const settings = settingsManager.getSettings();
  settings[key] = value;
  settingsManager.saveSettings();
  console.log(`[BlazeTracker] Setting ${key} updated`);
}
