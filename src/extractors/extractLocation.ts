import type { ExtractedData } from 'sillytavern-utils-lib/types';
import type { Message } from 'sillytavern-utils-lib';
import { Generator } from 'sillytavern-utils-lib';
import { getSettings } from '../ui/settings';

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
// Prompts
// ============================================

const LOCATION_INITIAL_PROMPT = `Analyze this roleplay scene and extract the current location. You must only return valid JSON with no commentary.

<instructions>
- Determine where this scene takes place.
- The 'area' should be a town, city or region (e.g. 'Huntsville, AL', 'London, Great Britain', 'Mt. Doom, Middle Earth', 'Ponyville, Equestria')
- The 'place' should be a building or sub-section (e.g. 'John's Warehouse', 'Fleet Street McDonalds', 'Slime-Covered Cave', 'School of Friendship')
- The 'position' should be a location within the place (e.g. 'Manager's Office', 'The Corner Booth', 'Underground River Bed', 'Rarity's Classroom')
- Props are nearby items that affect or could affect the scene - be specific about their state.
- Props should be items that can be interacted with. Walls are not prompts, people are not props, windows are not props etc.
- Examples of props: a TV (what's showing? is it off?), a bookshelf, a book, a bed, a sofa, a can of Coke, a pair of shoes etc.
- Each prop must be one individual item.
- If location is not explicit, infer from context clues: character descriptions, activities, mentioned objects.
</instructions>

<character_info>
{{characterInfo}}
</character_info>

<scene_messages>
{{messages}}
</scene_messages>

<schema>
${JSON.stringify(LOCATION_SCHEMA, null, 2)}
</schema>

<output_example>
${LOCATION_EXAMPLE}
</output_example>

Extract the location as valid JSON:`;

const LOCATION_UPDATE_PROMPT = `Analyze these roleplay messages and extract any location changes. You must only return valid JSON with no commentary.

<instructions>
- Determine if the location has changed from the previous state.
- Track any movement: characters entering new rooms, traveling, position changes within a space.
- Update props: new items introduced, items picked up/removed, items changing state.
- If no location change occurred, return the previous location but consider prop changes.
- Be careful to track items that have been picked up (remove from props) or put down (add to props).
- Prune props that are no longer relevant to the scene.
</instructions>

<previous_location>
{{previousLocation}}
</previous_location>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
${JSON.stringify(LOCATION_SCHEMA, null, 2)}
</schema>

<output_example>
${LOCATION_EXAMPLE}
</output_example>

Extract the current location as valid JSON:`;

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

  let prompt: string;

  if (isInitial) {
    prompt = LOCATION_INITIAL_PROMPT
      .replace('{{characterInfo}}', characterInfo)
      .replace('{{messages}}', messages);
  } else {
    prompt = LOCATION_UPDATE_PROMPT
      .replace('{{previousLocation}}', JSON.stringify(previousLocation, null, 2))
      .replace('{{messages}}', messages);
  }

  const llmMessages: Message[] = [
    { role: 'system', content: 'You are a location analysis agent for roleplay scenes. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ];

  const response = await makeGeneratorRequest(
    llmMessages,
    settings.profileId,
    settings.maxResponseTokens,
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
