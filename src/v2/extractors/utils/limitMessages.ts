/**
 * Message Limiting Utilities
 *
 * Provides functions to limit the number of messages sent to extractors
 * to reduce LLM context usage and costs.
 */

import type { ExtractionSettings } from '../types';

/**
 * Limit a message range to a maximum number of messages.
 * Always keeps the most recent messages (adjusts messageStart, keeps messageEnd).
 *
 * @param messageStart - Original start message index
 * @param messageEnd - Original end message index
 * @param maxMessages - Maximum number of messages to include
 * @returns Adjusted message range
 */
export function limitMessageRange(
	messageStart: number,
	messageEnd: number,
	maxMessages: number,
): { messageStart: number; messageEnd: number } {
	const requestedCount = messageEnd - messageStart + 1;

	if (requestedCount <= maxMessages) {
		return { messageStart, messageEnd };
	}

	return {
		messageStart: messageEnd - maxMessages + 1,
		messageEnd,
	};
}

/**
 * Get the max messages limit for an extractor.
 * Chapter description extractor uses maxChapterMessagesToSend,
 * all other extractors use maxMessagesToSend.
 *
 * Returns Infinity if the setting is not defined (no limit).
 *
 * @param settings - Extraction settings containing the limits
 * @param extractorName - Name of the extractor
 * @returns The max messages limit to use
 */
export function getMaxMessages(settings: ExtractionSettings, extractorName: string): number {
	if (extractorName === 'chapterDescription') {
		return settings.maxChapterMessagesToSend ?? Infinity;
	}
	return settings.maxMessagesToSend ?? Infinity;
}
