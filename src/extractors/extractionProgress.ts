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

export interface EnabledSteps {
	time: boolean;
	location: boolean;
	climate: boolean;
	characters: boolean;
	scene: boolean;
}

type ProgressCallback = (progress: ExtractionProgress) => void;

// ============================================
// Module State
// ============================================

let currentStep: ExtractionStep = 'idle';
let progressCallback: ProgressCallback | null = null;

// Default: all steps enabled
let enabledSteps: EnabledSteps = {
	time: true,
	location: true,
	climate: true,
	characters: true,
	scene: true,
};

// All possible extraction steps (in order)
const ALL_EXTRACTION_STEPS: ExtractionStep[] = ['time', 'location', 'climate', 'characters', 'scene'];

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
 * Configure which extraction steps are enabled for the current extraction.
 * Call this before starting extraction to ensure progress shows correct totals.
 */
export function setEnabledSteps(steps: EnabledSteps): void {
	enabledSteps = { ...steps };
}

/**
 * Get the list of currently enabled extraction steps.
 */
export function getEnabledSteps(): ExtractionStep[] {
	return ALL_EXTRACTION_STEPS.filter(step => enabledSteps[step as keyof EnabledSteps]);
}

/**
 * Set the current extraction step and notify listeners.
 */
export function setExtractionStep(step: ExtractionStep): void {
	currentStep = step;

	if (progressCallback) {
		const activeSteps = getEnabledSteps();

		const stepIndex =
			step === 'idle'
				? 0
				: step === 'complete'
					? activeSteps.length
					: activeSteps.indexOf(step);

		progressCallback({
			step,
			stepIndex: Math.max(0, stepIndex),
			totalSteps: activeSteps.length,
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
