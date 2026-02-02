/**
 * Tests for card extension reader functions.
 */

import { describe, it, expect, vi } from 'vitest';
import { namesMatch, writeAllExtensions } from './reader';
import type { STContextWithExtensions } from './reader';
import type { CardExtensions } from './types';
import {
	EXTENSION_KEY_LOCATION,
	EXTENSION_KEY_TIME,
	EXTENSION_KEY_OUTFIT,
	EXTENSION_KEY_PROFILE,
	EXTENSION_KEY_RELATIONSHIPS,
} from './types';

describe('namesMatch', () => {
	describe('exact matches', () => {
		it('matches identical names', () => {
			expect(namesMatch('John', 'John')).toBe(true);
		});

		it('matches case-insensitively', () => {
			expect(namesMatch('John', 'john')).toBe(true);
			expect(namesMatch('JOHN SMITH', 'john smith')).toBe(true);
		});

		it('trims whitespace', () => {
			expect(namesMatch('  John  ', 'John')).toBe(true);
		});
	});

	describe('first name matching', () => {
		it('matches first name to full name', () => {
			expect(namesMatch('John Smith', 'John')).toBe(true);
			expect(namesMatch('John', 'John Smith')).toBe(true);
		});

		it('matches first name to full name with middle name', () => {
			expect(namesMatch('John Michael Smith', 'John')).toBe(true);
		});
	});

	describe('title stripping', () => {
		it('strips Dr. title', () => {
			expect(namesMatch('Dr. John Smith', 'John Smith')).toBe(true);
			expect(namesMatch('Dr. John', 'John')).toBe(true);
		});

		it('strips Mr./Mrs./Ms. titles', () => {
			expect(namesMatch('Mr. Smith', 'Smith')).toBe(true);
			expect(namesMatch('Mrs. Smith', 'Smith')).toBe(true);
			expect(namesMatch('Ms. Smith', 'Smith')).toBe(true);
		});

		it('strips Professor title', () => {
			expect(namesMatch('Professor John', 'John')).toBe(true);
			expect(namesMatch('Prof. John', 'John')).toBe(true);
		});
	});

	describe('initial matching', () => {
		it('matches single letter initial to full name', () => {
			expect(namesMatch('J. Smith', 'John Smith')).toBe(true);
			expect(namesMatch('J Smith', 'John Smith')).toBe(true);
		});

		it('matches multiple initials', () => {
			expect(namesMatch('J. M. Smith', 'John Michael Smith')).toBe(true);
		});
	});

	describe('word-based matching', () => {
		it('matches when shorter name words all appear in longer', () => {
			expect(namesMatch('John Smith', 'John Michael Smith')).toBe(true);
		});

		it('matches last name only', () => {
			expect(namesMatch('Smith', 'John Smith')).toBe(true);
		});
	});

	describe('non-matches', () => {
		it('does not match completely different names', () => {
			expect(namesMatch('John', 'Jane')).toBe(false);
			expect(namesMatch('John Smith', 'Jane Doe')).toBe(false);
		});

		it('does not match partial word matches', () => {
			// "Jo" should not match "John" - only single letter initials do
			expect(namesMatch('Jo', 'John')).toBe(false);
		});

		it('does not match when no words overlap', () => {
			expect(namesMatch('Alice', 'Bob')).toBe(false);
		});
	});
});

/**
 * Create a mock ST context with a mocked writeExtensionField.
 */
function createMockContext(
	overrides: Partial<STContextWithExtensions> = {},
): STContextWithExtensions {
	return {
		eventSource: {},
		event_types: {},
		chat: [],
		chatMetadata: {},
		characters: [],
		characterId: 0,
		name1: 'User',
		name2: 'Character',
		generateQuietPrompt: vi.fn(),
		generateRaw: vi.fn(),
		deactivateSendButtons: vi.fn(),
		activateSendButtons: vi.fn(),
		stopGeneration: vi.fn(),
		setExtensionPrompt: vi.fn(),
		saveChat: vi.fn(),
		saveMetadataDebounced: vi.fn(),
		extensionSettings: {},
		saveSettingsDebounced: vi.fn(),
		Popup: {},
		callGenericPopup: vi.fn(),
		POPUP_TYPE: {},
		POPUP_RESULT: {},
		streamingProcessor: {},
		writeExtensionField: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe('writeAllExtensions', () => {
	it('writes null when relationships is undefined to clear extension', async () => {
		const mockWriteExtensionField = vi.fn().mockResolvedValue(undefined);
		const ctx = createMockContext({ writeExtensionField: mockWriteExtensionField });

		// The key 'relationships' exists in the object but is set to undefined
		await writeAllExtensions({ relationships: undefined } as CardExtensions, 0, ctx);

		expect(mockWriteExtensionField).toHaveBeenCalledWith(
			0,
			EXTENSION_KEY_RELATIONSHIPS,
			null,
		);
	});

	it('writes empty array when relationships is empty', async () => {
		const mockWriteExtensionField = vi.fn().mockResolvedValue(undefined);
		const ctx = createMockContext({ writeExtensionField: mockWriteExtensionField });

		await writeAllExtensions({ relationships: [] }, 0, ctx);

		expect(mockWriteExtensionField).toHaveBeenCalledWith(
			0,
			EXTENSION_KEY_RELATIONSHIPS,
			[],
		);
	});

	it('does not write relationships when key is not in extensions object', async () => {
		const mockWriteExtensionField = vi.fn().mockResolvedValue(undefined);
		const ctx = createMockContext({ writeExtensionField: mockWriteExtensionField });

		// Only location key exists, not relationships
		await writeAllExtensions({ location: { enabled: true, area: 'Test' } }, 0, ctx);

		expect(mockWriteExtensionField).toHaveBeenCalledWith(0, EXTENSION_KEY_LOCATION, {
			enabled: true,
			area: 'Test',
		});
		expect(mockWriteExtensionField).not.toHaveBeenCalledWith(
			0,
			EXTENSION_KEY_RELATIONSHIPS,
			expect.anything(),
		);
	});

	it('writes null when location is undefined to clear extension', async () => {
		const mockWriteExtensionField = vi.fn().mockResolvedValue(undefined);
		const ctx = createMockContext({ writeExtensionField: mockWriteExtensionField });

		await writeAllExtensions({ location: undefined } as CardExtensions, 0, ctx);

		expect(mockWriteExtensionField).toHaveBeenCalledWith(
			0,
			EXTENSION_KEY_LOCATION,
			null,
		);
	});

	it('writes null when time is undefined to clear extension', async () => {
		const mockWriteExtensionField = vi.fn().mockResolvedValue(undefined);
		const ctx = createMockContext({ writeExtensionField: mockWriteExtensionField });

		await writeAllExtensions({ time: undefined } as CardExtensions, 0, ctx);

		expect(mockWriteExtensionField).toHaveBeenCalledWith(0, EXTENSION_KEY_TIME, null);
	});

	it('writes null when outfit is undefined to clear extension', async () => {
		const mockWriteExtensionField = vi.fn().mockResolvedValue(undefined);
		const ctx = createMockContext({ writeExtensionField: mockWriteExtensionField });

		await writeAllExtensions({ outfit: undefined } as CardExtensions, 0, ctx);

		expect(mockWriteExtensionField).toHaveBeenCalledWith(0, EXTENSION_KEY_OUTFIT, null);
	});

	it('writes null when profile is undefined to clear extension', async () => {
		const mockWriteExtensionField = vi.fn().mockResolvedValue(undefined);
		const ctx = createMockContext({ writeExtensionField: mockWriteExtensionField });

		await writeAllExtensions({ profile: undefined } as CardExtensions, 0, ctx);

		expect(mockWriteExtensionField).toHaveBeenCalledWith(
			0,
			EXTENSION_KEY_PROFILE,
			null,
		);
	});

	it('writes all extensions when multiple keys are present', async () => {
		const mockWriteExtensionField = vi.fn().mockResolvedValue(undefined);
		const ctx = createMockContext({ writeExtensionField: mockWriteExtensionField });

		await writeAllExtensions(
			{
				location: { enabled: true, area: 'City' },
				relationships: [{ target: 'Friend', status: 'friendly' }],
			},
			0,
			ctx,
		);

		expect(mockWriteExtensionField).toHaveBeenCalledTimes(2);
		expect(mockWriteExtensionField).toHaveBeenCalledWith(0, EXTENSION_KEY_LOCATION, {
			enabled: true,
			area: 'City',
		});
		expect(mockWriteExtensionField).toHaveBeenCalledWith(
			0,
			EXTENSION_KEY_RELATIONSHIPS,
			[{ target: 'Friend', status: 'friendly' }],
		);
	});
});
