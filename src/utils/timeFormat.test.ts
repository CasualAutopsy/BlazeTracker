import { describe, it, expect } from 'vitest';
import { applyTimeFormat } from './timeFormat';

describe('applyTimeFormat', () => {
	describe('24-hour format', () => {
		it('formats midnight', () => {
			expect(applyTimeFormat(0, 0, '24h')).toBe('00:00');
		});

		it('formats early morning', () => {
			expect(applyTimeFormat(6, 30, '24h')).toBe('06:30');
		});

		it('formats noon', () => {
			expect(applyTimeFormat(12, 0, '24h')).toBe('12:00');
		});

		it('formats afternoon', () => {
			expect(applyTimeFormat(14, 45, '24h')).toBe('14:45');
		});

		it('formats late evening', () => {
			expect(applyTimeFormat(23, 59, '24h')).toBe('23:59');
		});

		it('pads single-digit hours', () => {
			expect(applyTimeFormat(9, 5, '24h')).toBe('09:05');
		});

		it('pads single-digit minutes', () => {
			expect(applyTimeFormat(15, 7, '24h')).toBe('15:07');
		});
	});

	describe('12-hour format', () => {
		it('formats midnight as 12:00 AM', () => {
			expect(applyTimeFormat(0, 0, '12h')).toBe('12:00 AM');
		});

		it('formats 1 AM', () => {
			expect(applyTimeFormat(1, 0, '12h')).toBe('1:00 AM');
		});

		it('formats late morning', () => {
			expect(applyTimeFormat(11, 30, '12h')).toBe('11:30 AM');
		});

		it('formats noon as 12:00 PM', () => {
			expect(applyTimeFormat(12, 0, '12h')).toBe('12:00 PM');
		});

		it('formats 1 PM', () => {
			expect(applyTimeFormat(13, 0, '12h')).toBe('1:00 PM');
		});

		it('formats afternoon', () => {
			expect(applyTimeFormat(15, 45, '12h')).toBe('3:45 PM');
		});

		it('formats late evening', () => {
			expect(applyTimeFormat(23, 59, '12h')).toBe('11:59 PM');
		});

		it('pads single-digit minutes', () => {
			expect(applyTimeFormat(9, 5, '12h')).toBe('9:05 AM');
		});

		it('does not pad hours in 12h format', () => {
			expect(applyTimeFormat(9, 0, '12h')).toBe('9:00 AM');
		});
	});

	describe('edge cases', () => {
		it('handles hour 0 correctly in 12h', () => {
			expect(applyTimeFormat(0, 30, '12h')).toBe('12:30 AM');
		});

		it('handles hour 12 correctly in 12h', () => {
			expect(applyTimeFormat(12, 30, '12h')).toBe('12:30 PM');
		});

		it('handles minute 0', () => {
			expect(applyTimeFormat(10, 0, '24h')).toBe('10:00');
			expect(applyTimeFormat(10, 0, '12h')).toBe('10:00 AM');
		});
	});
});
