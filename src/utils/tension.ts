import type { Scene } from '../types/state';

const TENSION_LEVEL_ORDER: Scene['tension']['level'][] = [
	'relaxed',
	'aware',
	'guarded',
	'tense',
	'charged',
	'volatile',
	'explosive',
];

export function calculateTensionDirection(
	currentLevel: Scene['tension']['level'],
	previousLevel?: Scene['tension']['level'],
): Scene['tension']['direction'] {
	if (!previousLevel) return 'stable';

	const currentIndex = TENSION_LEVEL_ORDER.indexOf(currentLevel);
	const previousIndex = TENSION_LEVEL_ORDER.indexOf(previousLevel);

	if (currentIndex > previousIndex) return 'escalating';
	if (currentIndex < previousIndex) return 'decreasing';
	return 'stable';
}
