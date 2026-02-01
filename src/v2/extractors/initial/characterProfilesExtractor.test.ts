/**
 * Character Profiles Extractor Tests
 *
 * Tests that verify the character profiles extractor builds prompts correctly
 * and parses responses properly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockGenerator, type MockGenerator } from '../../generator';
import { initialCharacterProfilesExtractor } from './characterProfilesExtractor';
import { createMockContext, createMockSettings, createMockCharacter } from './testHelpers';
import type { Snapshot } from '../../types';

describe('initialCharacterProfilesExtractor', () => {
	let mockGenerator: MockGenerator;

	beforeEach(() => {
		mockGenerator = createMockGenerator();
	});

	describe('shouldRun', () => {
		it('returns true when characters tracking is enabled and chat has messages', () => {
			const context = createMockContext();
			const settings = createMockSettings();

			expect(initialCharacterProfilesExtractor.shouldRun(settings, context)).toBe(
				true,
			);
		});

		it('returns false when characters tracking is disabled', () => {
			const context = createMockContext();
			const settings = createMockSettings({
				track: { ...createMockSettings().track, characters: false },
			});

			expect(initialCharacterProfilesExtractor.shouldRun(settings, context)).toBe(
				false,
			);
		});

		it('returns false when chat is empty', () => {
			const context = createMockContext({ chat: [] });
			const settings = createMockSettings();

			expect(initialCharacterProfilesExtractor.shouldRun(settings, context)).toBe(
				false,
			);
		});
	});

	describe('run', () => {
		it('returns empty object when partialSnapshot has no characters', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {};

			const result = await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			expect(result).toEqual({});
		});

		it('returns empty object when partialSnapshot has empty characters', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = { characters: {} };

			const result = await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			expect(result).toEqual({});
		});

		it('extracts profile for each character in partialSnapshot', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Elena is a young human woman with auburn hair.',
					character: 'Elena',
					profile: {
						sex: 'F',
						species: 'human',
						age: 25,
						appearance: ['auburn hair', 'green eyes'],
						personality: ['curious', 'determined'],
					},
				}),
			);

			const result = await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			expect(result.characters).toBeDefined();
			expect(result.characters?.Elena).toBeDefined();
			expect(result.characters?.Elena.profile).toEqual({
				sex: 'F',
				species: 'human',
				age: 25,
				appearance: ['auburn hair', 'green eyes'],
				personality: ['curious', 'determined'],
			});
		});

		it('passes target character name to the prompt', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Profile extraction.',
					character: 'Elena',
					profile: {
						sex: 'F',
						species: 'human',
						age: 25,
						appearance: [],
						personality: [],
					},
				}),
			);

			await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			const call = mockGenerator.getLastCall();
			expect(call).toBeDefined();

			const promptContent = call!.prompt.messages.map(m => m.content).join('\n');
			expect(promptContent).toContain('Elena');
		});

		it('passes messages to the prompt', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Profile extraction.',
					character: 'Elena',
					profile: {
						sex: 'F',
						species: 'human',
						age: 30,
						appearance: [],
						personality: [],
					},
				}),
			);

			await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			const call = mockGenerator.getLastCall();
			const promptContent = call!.prompt.messages.map(m => m.content).join('\n');
			expect(promptContent).toContain('coffee shop');
		});

		it('uses configured temperature', async () => {
			const context = createMockContext();
			const settings = createMockSettings({
				temperatures: {
					...createMockSettings().temperatures,
					characters: 0.9,
				},
			});
			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Test.',
					character: 'Elena',
					profile: {
						sex: 'F',
						species: 'human',
						age: 30,
						appearance: [],
						personality: [],
					},
				}),
			);

			await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			const call = mockGenerator.getLastCall();
			expect(call!.settings.temperature).toBe(0.9);
		});

		it('handles case-insensitive character name matching', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Profile extraction.',
					character: 'elena', // lowercase
					profile: {
						sex: 'F',
						species: 'human',
						age: 25,
						appearance: ['auburn hair'],
						personality: ['curious'],
					},
				}),
			);

			const result = await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			expect(result.characters?.Elena.profile?.sex).toBe('F');
		});

		it('preserves original character state when adding profile', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena', {
						position: 'at the counter',
						activity: 'ordering coffee',
						mood: ['happy'],
					}),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Profile extraction.',
					character: 'Elena',
					profile: {
						sex: 'F',
						species: 'human',
						age: 25,
						appearance: [],
						personality: [],
					},
				}),
			);

			const result = await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			expect(result.characters?.Elena.position).toBe('at the counter');
			expect(result.characters?.Elena.activity).toBe('ordering coffee');
			expect(result.characters?.Elena.mood).toEqual(['happy']);
			expect(result.characters?.Elena.profile).toBeDefined();
		});

		it('skips character when LLM returns unmatched character name', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Profile extraction.',
					character: 'Unknown',
					profile: {
						sex: 'F',
						species: 'human',
						age: 30,
						appearance: [],
						personality: [],
					},
				}),
			);

			const result = await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			// Character should still exist but without profile
			expect(result.characters?.Elena.profile).toBeUndefined();
		});

		it('returns characters without profiles when LLM returns invalid JSON', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse('Not valid JSON');

			const result = await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			// Character should still exist but without profile
			expect(result.characters?.Elena).toBeDefined();
			expect(result.characters?.Elena.profile).toBeUndefined();
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(initialCharacterProfilesExtractor.name).toBe(
				'initialCharacterProfiles',
			);
		});

		it('has the correct category', () => {
			expect(initialCharacterProfilesExtractor.category).toBe('characters');
		});

		it('has a default temperature', () => {
			expect(initialCharacterProfilesExtractor.defaultTemperature).toBe(0.5);
		});
	});

	describe('message limiting', () => {
		it('limits messages to maxMessagesToSend', async () => {
			// Create context with many messages
			const context = createMockContext({
				chat: [
					{
						mes: 'Message 0 - earliest',
						is_user: false,
						is_system: false,
						name: 'Elena',
					},
					{
						mes: 'Message 1',
						is_user: true,
						is_system: false,
						name: 'User',
					},
					{
						mes: 'Message 2',
						is_user: false,
						is_system: false,
						name: 'Elena',
					},
					{
						mes: 'Message 3',
						is_user: true,
						is_system: false,
						name: 'User',
					},
					{
						mes: 'Message 4',
						is_user: false,
						is_system: false,
						name: 'Elena',
					},
					{
						mes: 'Message 5',
						is_user: true,
						is_system: false,
						name: 'User',
					},
					{
						mes: 'Message 6',
						is_user: false,
						is_system: false,
						name: 'Elena',
					},
					{
						mes: 'Message 7',
						is_user: true,
						is_system: false,
						name: 'User',
					},
					{
						mes: 'Message 8',
						is_user: false,
						is_system: false,
						name: 'Elena',
					},
					{
						mes: 'Message 9 - latest',
						is_user: true,
						is_system: false,
						name: 'User',
					},
				],
			});

			// Set maxMessagesToSend to 3
			const settings = createMockSettings({
				maxMessagesToSend: 3,
			});

			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Profile extraction.',
					character: 'Elena',
					profile: {
						sex: 'F',
						species: 'human',
						age: 30,
						appearance: [],
						personality: [],
					},
				}),
			);

			await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			const call = mockGenerator.getLastCall();
			const promptContent = call!.prompt.messages.map(m => m.content).join('\n');

			// Should NOT contain early messages (limited to last 3)
			expect(promptContent).not.toContain('Message 0 - earliest');
			expect(promptContent).not.toContain('Message 1');
			expect(promptContent).not.toContain('Message 5');
			expect(promptContent).not.toContain('Message 6');

			// Should contain the most recent messages
			expect(promptContent).toContain('Message 9 - latest');
		});

		it('includes all messages when under maxMessagesToSend limit', async () => {
			// Create context with fewer messages than limit
			const context = createMockContext({
				chat: [
					{
						mes: 'First message',
						is_user: false,
						is_system: false,
						name: 'Elena',
					},
					{
						mes: 'Second message',
						is_user: true,
						is_system: false,
						name: 'User',
					},
				],
			});

			const settings = createMockSettings({
				maxMessagesToSend: 10, // Limit higher than message count
			});

			const partialSnapshot: Partial<Snapshot> = {
				characters: {
					Elena: createMockCharacter('Elena'),
				},
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Profile extraction.',
					character: 'Elena',
					profile: {
						sex: 'F',
						species: 'human',
						age: 30,
						appearance: [],
						personality: [],
					},
				}),
			);

			await initialCharacterProfilesExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			const call = mockGenerator.getLastCall();
			const promptContent = call!.prompt.messages.map(m => m.content).join('\n');

			// Should contain all messages since count is under limit
			expect(promptContent).toContain('First message');
			expect(promptContent).toContain('Second message');
		});
	});
});
