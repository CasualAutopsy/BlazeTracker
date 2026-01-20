import type { ExtractedData } from 'sillytavern-utils-lib/types';
import type { Message } from 'sillytavern-utils-lib';
import { Generator } from 'sillytavern-utils-lib';
import { getSettings } from '../settings';
import { getPrompt } from './prompts';
import type { Scene, Character } from '../types/state';
import { calculateTensionDirection } from '../utils/tension';

const generator = new Generator();

// ============================================
// Types (re-export for convenience)
// ============================================

export type TensionLevel = 'relaxed' | 'aware' | 'guarded' | 'tense' | 'charged' | 'volatile' | 'explosive';
export type TensionDirection = 'escalating' | 'stable' | 'decreasing';
export type TensionType = 'confrontation' | 'intimate' | 'vulnerable' | 'celebratory' | 'negotiation' | 'suspense' | 'conversation';

// ============================================
// Schema
// ============================================

export const SCENE_SCHEMA = {
  type: 'object',
  description: 'Summary of the current scene state',
  additionalProperties: false,
  properties: {
    topic: {
      type: 'string',
      description: '3-5 words describing the main topic(s) of the current interaction'
    },
    tone: {
      type: 'string',
      description: 'Dominant emotional tone of the scene (2-3 words)'
    },
    tension: {
      type: 'object',
      description: 'Current tension level in the scene',
      additionalProperties: false,
      properties: {
        level: {
          type: 'string',
          enum: ['relaxed', 'aware', 'guarded', 'tense', 'charged', 'volatile', 'explosive']
        },
        direction: {
          type: 'string',
          enum: ['escalating', 'stable', 'decreasing'],
          description: 'Set based on comparison with previous level - will be recalculated'
        },
        type: {
          type: 'string',
          enum: ['confrontation', 'intimate', 'vulnerable', 'celebratory', 'negotiation', 'suspense', 'conversation']
        }
      },
      required: ['level', 'direction', 'type']
    },
    recentEvents: {
      type: 'array',
      description: 'List of significant recent events (max 5). Prune resolved/superseded events, keep most salient.',
      items: {
        type: 'string',
        description: 'A significant event affecting the scene'
      },
      minItems: 1,
      maxItems: 5
    }
  },
  required: ['topic', 'tone', 'tension', 'recentEvents']
};

const SCENE_EXAMPLE = JSON.stringify({
  topic: "Marcus's heist plans",
  tone: 'Hushed, secretive',
  tension: {
    level: 'tense',
    direction: 'escalating',
    type: 'negotiation'
  },
  recentEvents: [
    "Marcus invited Elena and Sarah to discuss a jewellery heist",
    "Marcus discovered that Sarah has stolen a rare painting"
  ]
}, null, 2);

// ============================================
// Public API
// ============================================

export async function extractScene(
  isInitial: boolean,
  messages: string,
  characters: Character[],
  characterInfo: string,
  previousScene: Scene | null,
  abortSignal?: AbortSignal
): Promise<Scene> {
  const settings = getSettings();

  // Create a brief summary of characters for context
  const charactersSummary = characters
    .map(c => `${c.name}: ${c.mood.join(', ')} - ${c.activity || c.position}`)
    .join('\n');

  const schemaStr = JSON.stringify(SCENE_SCHEMA, null, 2);

  let prompt: string;

  if (isInitial) {
    prompt = getPrompt('scene_initial')
      .replace('{{characterInfo}}', characterInfo)
      .replace('{{charactersSummary}}', charactersSummary)
      .replace('{{messages}}', messages)
      .replace('{{schema}}', schemaStr)
      .replace('{{schemaExample}}', SCENE_EXAMPLE);
  } else {
    prompt = getPrompt('scene_update')
      .replace('{{charactersSummary}}', charactersSummary)
      .replace('{{previousState}}', JSON.stringify(previousScene, null, 2))
      .replace('{{messages}}', messages)
      .replace('{{schema}}', schemaStr)
      .replace('{{schemaExample}}', SCENE_EXAMPLE);
  }

  const llmMessages: Message[] = [
    { role: 'system', content: 'You are a scene analysis agent for roleplay. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ];

  const response = await makeGeneratorRequest(
    llmMessages,
    settings.profileId,
    200,
    abortSignal
  );

  const scene = validateScene(parseJsonResponse(response));

  // Recalculate tension direction based on previous state
  scene.tension.direction = calculateTensionDirection(
    scene.tension.level,
    previousScene?.tension?.level
  );

  return scene;
}

/**
 * Determine if scene extraction should run for this message.
 * Returns true if this is an assistant message (every 2nd message).
 */
export function shouldExtractScene(messageId: number, isAssistantMessage: boolean, isInitial: boolean): boolean {
  // Only extract scene after assistant responses
  return isAssistantMessage || isInitial;
}

// ============================================
// Internal: LLM Communication
// ============================================

function makeGeneratorRequest(
  messages: Message[],
  profileId: string,
  maxTokens: number,
  abortSignal?: AbortSignal
): Promise<string> {
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
          temperature: 0.6,
        }
      },
      {
        abortController,
        onFinish: (requestId, data, error) => {
          if (error) {
            return reject(error);
          }
          if (!data) {
            return reject(new DOMException('Request aborted', 'AbortError'));
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

// ============================================
// Internal: Response Parsing
// ============================================

function parseJsonResponse(response: string): any {
  let jsonStr = response.trim();

  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    jsonStr = objectMatch[0];
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[BlazeTracker/Scene] Failed to parse response:', e);
    console.error('[BlazeTracker/Scene] Response was:', response);
    throw new Error('Failed to parse scene extraction response as JSON');
  }
}

const VALID_TENSION_LEVELS: TensionLevel[] = ['relaxed', 'aware', 'guarded', 'tense', 'charged', 'volatile', 'explosive'];
const VALID_TENSION_DIRECTIONS: TensionDirection[] = ['escalating', 'stable', 'decreasing'];
const VALID_TENSION_TYPES: TensionType[] = ['confrontation', 'intimate', 'vulnerable', 'celebratory', 'negotiation', 'suspense', 'conversation'];

function validateScene(data: any): Scene {
  if (!data.topic || typeof data.topic !== 'string') {
    throw new Error('Invalid scene: missing topic');
  }

  // Validate tension
  const tension = data.tension || {};
  const level = VALID_TENSION_LEVELS.includes(tension.level) ? tension.level : 'relaxed';
  const direction = VALID_TENSION_DIRECTIONS.includes(tension.direction) ? tension.direction : 'stable';
  const type = VALID_TENSION_TYPES.includes(tension.type) ? tension.type : 'conversation';

  // Validate recent events
  let recentEvents = Array.isArray(data.recentEvents) ? data.recentEvents : [];
  recentEvents = recentEvents
    .filter((e: any) => typeof e === 'string' && e.length > 0)
    .slice(0, 5);

  if (recentEvents.length === 0) {
    recentEvents = ['Scene in progress'];
  }

  return {
    topic: data.topic,
    tone: typeof data.tone === 'string' ? data.tone : 'neutral',
    tension: { level, direction, type },
    recentEvents,
  };
}
