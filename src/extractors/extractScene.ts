import type { ExtractedData } from 'sillytavern-utils-lib/types';
import type { Message } from 'sillytavern-utils-lib';
import { Generator } from 'sillytavern-utils-lib';
import { getSettings } from '../ui/settings';
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
          enum: ['relaxed', 'aware', 'guarded', 'tense', 'charged', 'volatile', 'explosive'],
          description: 'The level of tension in the current scene. This should not remain the same for too long.'
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
// Prompts
// ============================================

const SCENE_INITIAL_PROMPT = `Analyze this roleplay scene and extract the scene state. You must only return valid JSON with no commentary.

<instructions>
<general>
- Determine the topic, tone, tension, and significant events of the scene.
- Topic should be 3-5 words summarizing the main focus.
- Tone should be 2-3 words capturing the emotional atmosphere.
</general>
<tension>
- Level indicates how charged the scene is emotionally/dramatically. It can go up as well as down.
- Type categorizes what kind of tension: confrontation, intimate, negotiation, etc.
- Direction will be calculated automatically, but set your best guess.
- Make sure to update this when necessary.
- Scenes should not remain the same tension level for too long.
<levels>
- relaxed means that there is very little tension in the scene, it is cozy, like post-coital cuddles or relaxing and watching TV
- aware means that there is some tension, in an intimate scene this could be some glancing, in a confrontation, minor disagreement
- guarded means that there is a little more tension, in an intimate scene this could be playful teasing, in a vulnerable scene it could be internal tension like characters wondering what to say and what not to say
- tense means that the scene is approaching a breaking point, it will either escalate into something higher or de-escalate, it shouldn't stay at this level for long
- charged means that the tension is obvious, in an intimate scene this could lead to kisses or sex, in a celebratory scene, a big reveal or someone overdoing it at the bar
- volatile means that the tension is about to go over the edge, in a confrontation this could be a fight, in an intimate scene this is leading to something big
- explosive is the highest level of tension, a fight, the moment before sex, just before a major decision, then it will almost always de-escalate
</levels>
</tension>
<recent_events>
- Include significant events that affect the ongoing narrative.
- Events should be consequential: discoveries, relationship changes, injuries, commitments.
- Maximum 5 events, prioritize the most important ones.
</recent_events>
</instructions>

<character_info>
{{characterInfo}}
</character_info>

<characters_present>
{{charactersSummary}}
</characters_present>

<scene_messages>
{{messages}}
</scene_messages>

<schema>
${JSON.stringify(SCENE_SCHEMA, null, 2)}
</schema>

<output_example>
${SCENE_EXAMPLE}
</output_example>

Extract the scene state as valid JSON:`;

const SCENE_UPDATE_PROMPT = `Analyze these roleplay messages and update the scene state. You must only return valid JSON with no commentary.

<instructions>
<general>
- Update topic if the focus has shifted.
- Update tone if the emotional atmosphere has changed.
- Consider whether tension has increased, decreased, or remained stable.
</general>
<tension>
- Adjust level based on what happened in the messages.
- Type may change: a negotiation could become a confrontation.
- Level should be recalculated, the previous_scene should not be assumed to be right.
- Direction will be recalculated based on level change.
</tension>
<recent_events>
- Keep events that are still relevant to the ongoing scene.
- Remove events that have been resolved or superseded.
- Add new significant events from the recent messages.
- Maximum 5 events - prune aggressively, keep most salient.
- Even if previous_scene has more than 5 events, return at most 5.
</recent_events>
</instructions>

<characters_present>
{{charactersSummary}}
</characters_present>

<previous_scene>
{{previousScene}}
</previous_scene>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
${JSON.stringify(SCENE_SCHEMA, null, 2)}
</schema>

<output_example>
${SCENE_EXAMPLE}
</output_example>

Extract the updated scene state as valid JSON:`;

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

  let prompt: string;

  if (isInitial) {
    prompt = SCENE_INITIAL_PROMPT
      .replace('{{characterInfo}}', characterInfo)
      .replace('{{charactersSummary}}', charactersSummary)
      .replace('{{messages}}', messages);
  } else {
    prompt = SCENE_UPDATE_PROMPT
      .replace('{{charactersSummary}}', charactersSummary)
      .replace('{{previousScene}}', JSON.stringify(previousScene, null, 2))
      .replace('{{messages}}', messages);
  }

  const llmMessages: Message[] = [
    { role: 'system', content: 'You are a scene analysis agent for roleplay. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ];

  const response = await makeGeneratorRequest(
    llmMessages,
    settings.profileId,
    settings.maxResponseTokens,
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
