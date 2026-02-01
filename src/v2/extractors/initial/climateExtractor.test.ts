/**
 * Climate Extractor Tests
 *
 * Tests that verify the climate extractor builds prompts correctly
 * and parses responses properly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockGenerator, type MockGenerator } from '../../generator';
import { climateExtractor } from './climateExtractor';
import { createMockContext, createMockSettings, createMockLocation } from './testHelpers';
import type { Snapshot } from '../../types';

describe('climateExtractor', () => {
	let mockGenerator: MockGenerator;

	beforeEach(() => {
		mockGenerator = createMockGenerator();
	});

	describe('shouldRun', () => {
		it('returns true when climate tracking is enabled and chat has messages', () => {
			const context = createMockContext();
			const settings = createMockSettings();

			expect(climateExtractor.shouldRun(settings, context)).toBe(true);
		});

		it('returns false when climate tracking is disabled', () => {
			const context = createMockContext();
			const settings = createMockSettings({
				track: { ...createMockSettings().track, climate: false },
			});

			expect(climateExtractor.shouldRun(settings, context)).toBe(false);
		});

		it('returns false when chat is empty', () => {
			const context = createMockContext({ chat: [] });
			const settings = createMockSettings();

			expect(climateExtractor.shouldRun(settings, context)).toBe(false);
		});
	});

	describe('run', () => {
		it('passes messages to the prompt', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'The scene is indoors at a coffee shop.',
					temperature: 20,
					conditions: 'Clear',
					isIndoors: true,
				}),
			);

			await climateExtractor.run(mockGenerator, context, settings, {});

			const call = mockGenerator.getLastCall();
			expect(call).toBeDefined();

			const promptContent = call!.prompt.messages.map(m => m.content).join('\n');
			expect(promptContent).toContain('coffee shop');
		});

		it('passes character name to the prompt', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Test.',
					temperature: 20,
					conditions: 'Clear',
					isIndoors: true,
				}),
			);

			await climateExtractor.run(mockGenerator, context, settings, {});

			const call = mockGenerator.getLastCall();
			const promptContent = call!.prompt.messages.map(m => m.content).join('\n');
			expect(promptContent).toContain('Elena');
		});

		it('uses configured temperature', async () => {
			const context = createMockContext();
			const settings = createMockSettings({
				temperatures: {
					...createMockSettings().temperatures,
					climate: 0.1,
				},
			});

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Test.',
					temperature: 20,
					conditions: 'Clear',
					isIndoors: true,
				}),
			);

			await climateExtractor.run(mockGenerator, context, settings, {});

			const call = mockGenerator.getLastCall();
			expect(call!.settings.temperature).toBe(0.1);
		});

		it('returns climate state from LLM response', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'A cool autumn day.',
					temperature: 15,
					conditions: 'Partly cloudy',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate).toBeDefined();
			expect(result.climate?.temperature).toBe(15);
			expect(result.climate?.conditions).toBe('Partly cloudy');
			expect(result.climate?.isIndoors).toBe(false);
		});

		it('infers conditionType from conditions string - sunny', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Bright sunny day.',
					temperature: 25,
					conditions: 'Sunny and bright',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.conditionType).toBe('sunny');
		});

		it('infers conditionType from conditions string - rain', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Rainy day.',
					temperature: 12,
					conditions: 'Light rain falling',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.conditionType).toBe('rain');
		});

		it('infers conditionType from conditions string - thunderstorm', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Stormy weather.',
					temperature: 18,
					conditions: 'Thunderstorm with heavy rain',
					isIndoors: true,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.conditionType).toBe('thunderstorm');
		});

		it('infers conditionType from conditions string - snow', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Snowy winter day.',
					temperature: -5,
					conditions: 'Light snow falling',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.conditionType).toBe('snow');
		});

		it('defaults conditionType to clear when unrecognized', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Unknown conditions.',
					temperature: 20,
					conditions: 'Pleasant',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.conditionType).toBe('clear');
		});

		it('infers daylight phase from conditions - dawn', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Early morning.',
					temperature: 15,
					conditions: 'Clear skies at dawn',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.daylight).toBe('dawn');
		});

		it('infers daylight phase from conditions - night', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Late night.',
					temperature: 10,
					conditions: 'Clear night sky',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.daylight).toBe('night');
		});

		it('defaults daylight to day when unrecognized', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Normal conditions.',
					temperature: 20,
					conditions: 'Clear',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.daylight).toBe('day');
		});

		it('sets sensible defaults for climate properties', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Test.',
					temperature: 22,
					conditions: 'Clear',
					isIndoors: false,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result.climate?.feelsLike).toBe(22); // Same as temperature
			expect(result.climate?.humidity).toBe(50); // Default
			expect(result.climate?.precipitation).toBe(0); // Default
			expect(result.climate?.cloudCover).toBe(0); // Default
			expect(result.climate?.windSpeed).toBe(0); // Default
			expect(result.climate?.windDirection).toBe('N'); // Default
		});

		it('sets UV index based on indoor/outdoor status', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			// Outdoors
			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Outdoor scene.',
					temperature: 25,
					conditions: 'Clear',
					isIndoors: false,
				}),
			);

			let result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);
			expect(result.climate?.uvIndex).toBe(5); // Moderate UV outdoors

			// Indoors
			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Indoor scene.',
					temperature: 22,
					conditions: 'Clear',
					isIndoors: true,
				}),
			);

			result = await climateExtractor.run(mockGenerator, context, settings, {});
			expect(result.climate?.uvIndex).toBe(0); // No UV indoors
		});

		it('runs successfully when location context is available in partialSnapshot', async () => {
			const context = createMockContext();
			const settings = createMockSettings();
			const partialSnapshot: Partial<Snapshot> = {
				location: createMockLocation({
					area: 'Downtown',
					place: 'Coffee Shop',
				}),
			};

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Indoor coffee shop.',
					temperature: 20,
					conditions: 'Clear',
					isIndoors: true,
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				partialSnapshot,
			);

			// Should still extract climate successfully even with location in partial snapshot
			expect(result.climate).toBeDefined();
			expect(result.climate?.temperature).toBe(20);
			expect(result.climate?.isIndoors).toBe(true);
		});

		it('returns empty object when LLM returns invalid JSON', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse('Not valid JSON');

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result).toEqual({});
		});

		it('returns empty object when LLM returns incomplete data', async () => {
			const context = createMockContext();
			const settings = createMockSettings();

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Incomplete.',
					// Missing temperature, conditions, isIndoors
				}),
			);

			const result = await climateExtractor.run(
				mockGenerator,
				context,
				settings,
				{},
			);

			expect(result).toEqual({});
		});
	});

	describe('metadata', () => {
		it('has the correct name', () => {
			expect(climateExtractor.name).toBe('initialClimate');
		});

		it('has the correct category', () => {
			expect(climateExtractor.category).toBe('climate');
		});

		it('has a default temperature', () => {
			expect(climateExtractor.defaultTemperature).toBe(0.3);
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

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Climate extraction.',
					temperature: 20,
					conditions: 'Clear',
					isIndoors: true,
				}),
			);

			await climateExtractor.run(mockGenerator, context, settings, {});

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

			mockGenerator.setDefaultResponse(
				JSON.stringify({
					reasoning: 'Climate extraction.',
					temperature: 20,
					conditions: 'Clear',
					isIndoors: true,
				}),
			);

			await climateExtractor.run(mockGenerator, context, settings, {});

			const call = mockGenerator.getLastCall();
			const promptContent = call!.prompt.messages.map(m => m.content).join('\n');

			// Should contain all messages since count is under limit
			expect(promptContent).toContain('First message');
			expect(promptContent).toContain('Second message');
		});
	});
});
