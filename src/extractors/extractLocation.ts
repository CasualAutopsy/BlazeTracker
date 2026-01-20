import type { ExtractedData } from 'sillytavern-utils-lib/types';
import type { Message } from 'sillytavern-utils-lib';
import { Generator } from 'sillytavern-utils-lib';
import { getSettings } from '../settings';
import { getPrompt } from './prompts';

const generator = new Generator();

// ============================================
// Types
// ============================================

export interface LocationState {
  area: string;
  place: string;
  position: string;
  props: string[];
}

// ============================================
// Schema
// ============================================

export const LOCATION_SCHEMA = {
  type: 'object',
  description: 'Current location in the scene',
  additionalProperties: false,
  properties: {
    area: {
      type: 'string',
      description: "General area: city, district, or region (e.g. 'The Glossy Mountains', 'Sherwood Forest', 'London, UK', 'Ponyville, Equestria')"
    },
    place: {
      type: 'string',
      description: "Specific place: building, establishment, room (e.g. 'The Rusty Nail bar', 'Elena's bedroom', 'Industrial Estate Parking Lot')"
    },
    position: {
      type: 'string',
      description: "Position within place - a room or local landmark. Do not mention characters/objects or scene actions (e.g. 'By the dumpster', 'The corner booth', 'In the jacuzzi', 'Near the bathroom door')"
    },
    props: {
      type: 'array',
      description: 'Nearby items affecting the scene. Add details where relevant (e.g. "TV - showing a western", "half-empty wine bottle")',
      items: {
        type: 'string',
        description: 'A nearby item which is part of the scene, detailed'
      },
      maxItems: 10
    }
  },
  required: ['area', 'place', 'position', 'props']
};

const LOCATION_EXAMPLE = JSON.stringify({
  area: 'Downtown Seattle',
  place: 'The Rusty Nail bar',
  position: 'Corner booth near the jukebox',
  props: ['Jukebox playing soft rock', 'Empty beer glasses', 'Bowl of peanuts', 'Flickering neon sign']
}, null, 2);

// ============================================
// Public API
// ============================================

export async function extractLocation(
  isInitial: boolean,
  messages: string,
  characterInfo: string,
  previousLocation: LocationState | null,
  abortSignal?: AbortSignal
): Promise<LocationState> {
  const settings = getSettings();

  const schemaStr = JSON.stringify(LOCATION_SCHEMA, null, 2);

  let prompt: string;

  if (isInitial) {
    prompt = getPrompt('location_initial')
      .replace('{{characterInfo}}', characterInfo)
      .replace('{{messages}}', messages)
      .replace('{{schema}}', schemaStr)
      .replace('{{schemaExample}}', LOCATION_EXAMPLE);
  } else {
    prompt = getPrompt('location_update')
      .replace('{{previousState}}', JSON.stringify(previousLocation, null, 2))
      .replace('{{messages}}', messages)
      .replace('{{schema}}', schemaStr)
      .replace('{{schemaExample}}', LOCATION_EXAMPLE);
  }

  const llmMessages: Message[] = [
    { role: 'system', content: 'You are a location analysis agent for roleplay scenes. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ];

  const response = await makeGeneratorRequest(
    llmMessages,
    settings.profileId,
    200,
    abortSignal
  );

  return validateLocation(parseJsonResponse(response));
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
          temperature: 0.5,
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
    console.error('[BlazeTracker/Location] Failed to parse response:', e);
    console.error('[BlazeTracker/Location] Response was:', response);
    throw new Error('Failed to parse location extraction response as JSON');
  }
}

function validateLocation(data: any): LocationState {
  if (!data.place || typeof data.place !== 'string') {
    throw new Error('Invalid location: missing or invalid place');
  }

  return {
    area: typeof data.area === 'string' ? data.area : 'Unknown Area',
    place: data.place,
    position: typeof data.position === 'string' ? data.position : 'Main area',
    props: Array.isArray(data.props) ? data.props.slice(0, 10) : [],
  };
}
