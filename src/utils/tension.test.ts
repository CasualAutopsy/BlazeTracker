import { describe, it, expect } from 'vitest';
import { calculateTensionDirection } from './tension';

describe('calculateTensionDirection', () => {
	describe('without previous level', () => {
		it('returns stable when no previous level', () => {
			expect(calculateTensionDirection('relaxed')).toBe('stable');
			expect(calculateTensionDirection('tense')).toBe('stable');
			expect(calculateTensionDirection('explosive')).toBe('stable');
		});

		it('returns stable when previous level is undefined', () => {
			expect(calculateTensionDirection('guarded', undefined)).toBe('stable');
		});
	});

	describe('escalating', () => {
		it('detects escalation from relaxed to aware', () => {
			expect(calculateTensionDirection('aware', 'relaxed')).toBe('escalating');
		});

		it('detects escalation from relaxed to explosive', () => {
			expect(calculateTensionDirection('explosive', 'relaxed')).toBe('escalating');
		});

		it('detects escalation from guarded to tense', () => {
			expect(calculateTensionDirection('tense', 'guarded')).toBe('escalating');
		});

		it('detects escalation from volatile to explosive', () => {
			expect(calculateTensionDirection('explosive', 'volatile')).toBe('escalating');
		});

		it('detects escalation across multiple levels', () => {
			expect(calculateTensionDirection('charged', 'aware')).toBe('escalating');
		});
	});

	describe('decreasing', () => {
		it('detects decrease from aware to relaxed', () => {
			expect(calculateTensionDirection('relaxed', 'aware')).toBe('decreasing');
		});

		it('detects decrease from explosive to relaxed', () => {
			expect(calculateTensionDirection('relaxed', 'explosive')).toBe('decreasing');
		});

		it('detects decrease from tense to guarded', () => {
			expect(calculateTensionDirection('guarded', 'tense')).toBe('decreasing');
		});

		it('detects decrease from explosive to volatile', () => {
			expect(calculateTensionDirection('volatile', 'explosive')).toBe('decreasing');
		});

		it('detects decrease across multiple levels', () => {
			expect(calculateTensionDirection('aware', 'charged')).toBe('decreasing');
		});
	});

	describe('stable', () => {
		it('returns stable when level unchanged - relaxed', () => {
			expect(calculateTensionDirection('relaxed', 'relaxed')).toBe('stable');
		});

		it('returns stable when level unchanged - tense', () => {
			expect(calculateTensionDirection('tense', 'tense')).toBe('stable');
		});

		it('returns stable when level unchanged - explosive', () => {
			expect(calculateTensionDirection('explosive', 'explosive')).toBe('stable');
		});
	});

	describe('all tension levels', () => {
		const levels = [
			'relaxed',
			'aware',
			'guarded',
			'tense',
			'charged',
			'volatile',
			'explosive',
		] as const;

		it('correctly orders all levels for escalation', () => {
			for (let i = 0; i < levels.length - 1; i++) {
				expect(calculateTensionDirection(levels[i + 1], levels[i])).toBe('escalating');
			}
		});

		it('correctly orders all levels for decrease', () => {
			for (let i = levels.length - 1; i > 0; i--) {
				expect(calculateTensionDirection(levels[i - 1], levels[i])).toBe('decreasing');
			}
		});
	});
});
