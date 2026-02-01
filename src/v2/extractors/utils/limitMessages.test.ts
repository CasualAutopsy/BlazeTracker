/**
 * Tests for limitMessages utility functions.
 */

import { describe, it, expect } from 'vitest';
import { limitMessageRange, getMaxMessages } from './limitMessages';
import type { ExtractionSettings } from '../types';

describe('limitMessageRange', () => {
	it('returns original range when under limit', () => {
		const result = limitMessageRange(0, 4, 10);
		expect(result).toEqual({ messageStart: 0, messageEnd: 4 });
	});

	it('returns original range when exactly at limit', () => {
		const result = limitMessageRange(0, 9, 10);
		expect(result).toEqual({ messageStart: 0, messageEnd: 9 });
	});

	it('limits range to most recent messages when over limit', () => {
		const result = limitMessageRange(0, 49, 10);
		expect(result).toEqual({ messageStart: 40, messageEnd: 49 });
	});

	it('handles single message range', () => {
		const result = limitMessageRange(5, 5, 10);
		expect(result).toEqual({ messageStart: 5, messageEnd: 5 });
	});

	it('handles limit of 1', () => {
		const result = limitMessageRange(0, 10, 1);
		expect(result).toEqual({ messageStart: 10, messageEnd: 10 });
	});

	it('handles large message ranges', () => {
		const result = limitMessageRange(0, 999, 24);
		expect(result).toEqual({ messageStart: 976, messageEnd: 999 });
	});

	it('handles mid-range start with limiting', () => {
		// Messages 50-100, limit to 10 -> should get 91-100
		const result = limitMessageRange(50, 100, 10);
		expect(result).toEqual({ messageStart: 91, messageEnd: 100 });
	});
});

describe('getMaxMessages', () => {
	const createSettings = (
		maxMessagesToSend?: number,
		maxChapterMessagesToSend?: number,
	): ExtractionSettings =>
		({
			maxMessagesToSend,
			maxChapterMessagesToSend,
		}) as ExtractionSettings;

	it('returns maxChapterMessagesToSend for chapterDescription extractor', () => {
		const settings = createSettings(10, 24);
		expect(getMaxMessages(settings, 'chapterDescription')).toBe(24);
	});

	it('returns maxMessagesToSend for other extractors', () => {
		const settings = createSettings(10, 24);
		expect(getMaxMessages(settings, 'timeChange')).toBe(10);
		expect(getMaxMessages(settings, 'locationChange')).toBe(10);
		expect(getMaxMessages(settings, 'presenceChange')).toBe(10);
		expect(getMaxMessages(settings, 'milestoneDescription')).toBe(10);
	});

	it('handles custom settings values', () => {
		const settings = createSettings(5, 50);
		expect(getMaxMessages(settings, 'chapterDescription')).toBe(50);
		expect(getMaxMessages(settings, 'timeChange')).toBe(5);
	});

	it('returns Infinity when maxMessagesToSend is undefined', () => {
		const settings = createSettings(undefined, 24);
		expect(getMaxMessages(settings, 'timeChange')).toBe(Infinity);
	});

	it('returns Infinity when maxChapterMessagesToSend is undefined', () => {
		const settings = createSettings(10, undefined);
		expect(getMaxMessages(settings, 'chapterDescription')).toBe(Infinity);
	});

	it('returns Infinity for both when settings are empty', () => {
		const settings = {} as ExtractionSettings;
		expect(getMaxMessages(settings, 'timeChange')).toBe(Infinity);
		expect(getMaxMessages(settings, 'chapterDescription')).toBe(Infinity);
	});
});
