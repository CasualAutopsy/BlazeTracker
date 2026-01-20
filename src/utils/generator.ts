import type { ExtractedData } from 'sillytavern-utils-lib/types';
import type { Message } from 'sillytavern-utils-lib';
import { Generator } from 'sillytavern-utils-lib';

const generator = new Generator();

export interface GeneratorOptions {
	profileId: string;
	maxTokens: number;
	temperature?: number;
	abortSignal?: AbortSignal;
}

/**
 * Make a request to the LLM via SillyTavern's Generator.
 * Centralized to avoid duplication across extractors.
 */
export function makeGeneratorRequest(
	messages: Message[],
	options: GeneratorOptions,
): Promise<string> {
	const { profileId, maxTokens, temperature = 0.5, abortSignal } = options;

	return new Promise((resolve, reject) => {
		if (abortSignal?.aborted) {
			return reject(new DOMException('Aborted', 'AbortError'));
		}

		const abortController = new AbortController();

		if (abortSignal) {
			abortSignal.addEventListener('abort', () => abortController.abort());
		}

		generator.generateRequest(
			{
				profileId,
				prompt: messages,
				maxTokens,
				custom: { signal: abortController.signal },
				overridePayload: {
					temperature,
				},
			},
			{
				abortController,
				onFinish: (_requestId, data, error) => {
					if (error) {
						return reject(error);
					}
					if (!data) {
						return reject(
							new DOMException(
								'Request aborted',
								'AbortError',
							),
						);
					}
					const content = (data as ExtractedData).content;
					if (typeof content === 'string') {
						resolve(content);
					} else {
						resolve(JSON.stringify(content));
					}
				},
			},
		);
	});
}

/**
 * Build a standard message array for extraction prompts.
 */
export function buildExtractionMessages(systemPrompt: string, userPrompt: string): Message[] {
	return [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: userPrompt },
	];
}
