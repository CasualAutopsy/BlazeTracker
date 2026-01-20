// ============================================
// Extraction Progress Tracking
// ============================================

export type ExtractionStep =
	| 'idle'
	| 'time'
	| 'location'
	| 'climate'
	| 'characters'
	| 'scene'
	| 'complete';

export interface ExtractionProgress {
	step: ExtractionStep;
	stepIndex: number;
	totalSteps: number;
}

type ProgressCallback = (progress: ExtractionProgress) => void;

// ============================================
// Module State
// ============================================

let currentStep: ExtractionStep = 'idle';
let progressCallback: ProgressCallback | null = null;

// Steps in order (scene is optional, handled separately)
const EXTRACTION_STEPS: ExtractionStep[] = ['time', 'location', 'climate', 'characters', 'scene'];

// ============================================
// Public API
// ============================================

/**
 * Register a callback to receive progress updates.
 */
export function onExtractionProgress(callback: ProgressCallback | null): void {
	progressCallback = callback;
}

/**
 * Set the current extraction step and notify listeners.
 */
export function setExtractionStep(step: ExtractionStep, includeScene: boolean = true): void {
	currentStep = step;

	if (progressCallback) {
		const steps = includeScene
			? EXTRACTION_STEPS
			: EXTRACTION_STEPS.filter(s => s !== 'scene');

		const stepIndex =
			step === 'idle'
				? 0
				: step === 'complete'
					? steps.length
					: steps.indexOf(step);

		progressCallback({
			step,
			stepIndex: Math.max(0, stepIndex),
			totalSteps: steps.length,
		});
	}
}

/**
 * Get the current extraction step.
 */
export function getExtractionStep(): ExtractionStep {
	return currentStep;
}

/**
 * Get a human-readable label for a step.
 */
export function getStepLabel(step: ExtractionStep): string {
	switch (step) {
		case 'idle':
			return 'Ready';
		case 'time':
			return 'Extracting time...';
		case 'location':
			return 'Extracting location...';
		case 'climate':
			return 'Extracting climate...';
		case 'characters':
			return 'Extracting characters...';
		case 'scene':
			return 'Extracting scene...';
		case 'complete':
			return 'Complete';
	}
}
