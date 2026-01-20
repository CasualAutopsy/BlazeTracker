import type { ExtractedData } from 'sillytavern-utils-lib/types';
import type { Message } from 'sillytavern-utils-lib';
import { Generator } from 'sillytavern-utils-lib';
import { getSettings } from '../ui/settings';
import type { Character, CharacterOutfit } from '../types/state';
import type { LocationState } from './extractLocation';

const generator = new Generator();

// ============================================
// Schema
// ============================================

export const CHARACTERS_SCHEMA = {
  type: 'array',
  description: 'All characters present in the current scene',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: {
        type: 'string',
        description: "Character's name as used in the scene"
      },
      goals: {
        type: 'array',
        description: "Character's short-term goals",
        items: { type: 'string' }
      },
      position: {
        type: 'string',
        description: "Physical position and where (e.g. 'sitting at the bar', 'leaning against the wall'). Be detailed about who they're facing/interacting with."
      },
      activity: {
        type: 'string',
        description: "Current activity if any (e.g. 'nursing a whiskey', 'texting on phone')"
      },
      mood: {
        type: 'array',
        description: 'Current emotional states',
        minItems: 1,
        maxItems: 5,
        items: { type: 'string' }
      },
      physicalState: {
        type: 'array',
        description: 'Physical conditions affecting the character',
        maxItems: 5,
        items: { type: 'string' }
      },
      outfit: {
        type: 'object',
        description: 'Clothing items currently worn. Set to null if removed or if species would not wear clothes (pony, Pokémon, etc.)',
        properties: {
          head: { type: ['string', 'null'], description: 'Headwear (null if none)' },
          jacket: { type: ['string', 'null'], description: 'Outer layer (null if none)' },
          torso: { type: ['string', 'null'], description: 'Shirt/top (null if none)' },
          legs: { type: ['string', 'null'], description: 'Pants/skirt (null if none)' },
          underwear: { type: ['string', 'null'], description: 'Underwear, be descriptive if partially removed' },
          socks: { type: ['string', 'null'], description: 'Socks/stockings, specify which foot if only one' },
          footwear: { type: ['string', 'null'], description: 'Shoes/boots, specify which foot if only one' }
        },
        required: ['head', 'jacket', 'torso', 'legs', 'underwear', 'socks', 'footwear']
      },
      dispositions: {
        type: 'object',
        description: 'Feelings toward other characters in the scene',
        additionalProperties: {
          type: 'array',
          maxItems: 5,
          items: { type: 'string' }
        }
      }
    },
    required: ['name', 'position', 'activity', 'mood', 'physicalState', 'outfit', 'dispositions']
  }
};

const CHARACTERS_EXAMPLE = JSON.stringify([
  {
    name: 'Elena',
    position: 'Sitting in the booth, facing the entrance, hands wrapped around a coffee mug',
    activity: 'Watching the door nervously',
    mood: ['anxious', 'hopeful'],
    goals: ['find out what Marcus wants', 'protect Sarah'],
    physicalState: ['tired'],
    outfit: {
      head: null,
      jacket: null,
      torso: 'Dark red blouse',
      legs: 'Black jeans',
      underwear: 'Black lace bra and matching panties',
      socks: 'Black tights',
      footwear: 'Black ankle boots'
    },
    dispositions: {
      Marcus: ['suspicious', 'curious'],
      Sarah: ['trusting', 'protective']
    }
  }
], null, 2);

// ============================================
// Prompts
// ============================================

const CHARACTERS_INITIAL_PROMPT = `Analyze this roleplay scene and extract all character states. You must only return valid JSON with no commentary.

<instructions>
<general>
- Extract all characters present in the scene.
- For each character, determine their position, activity, mood, physical state, outfit, and dispositions.
- Make reasonable inferences where information is not explicit.
</general>
<outfit_rules>
- Consider whether the character would usually wear clothes (ponies, Pokémon, animals typically don't).
- For non-clothed species, return null for all outfit slots unless explicitly dressed.
- Be specific: 't-shirt' not 'default top' or 'unspecified top'.
- Include underwear/socks with reasonable assumptions for clothed characters.
- Fur, scales, and other anatomy do NOT count as outfit items.
</outfit_rules>
<dispositions>
- Only include dispositions for characters who know each other exists.
- Feelings should be specific: 'suspicious', 'attracted', 'annoyed', not just 'positive'.
</dispositions>
</instructions>

<character_info>
{{userInfo}}

{{characterInfo}}
</character_info>

<current_location>
{{location}}
</current_location>

<scene_messages>
{{messages}}
</scene_messages>

<schema>
${JSON.stringify(CHARACTERS_SCHEMA, null, 2)}
</schema>

<output_example>
${CHARACTERS_EXAMPLE}
</output_example>

Extract all characters as valid JSON array:`;

const CHARACTERS_UPDATE_PROMPT = `Analyze these roleplay messages and update character states. You must only return valid JSON with no commentary.

<instructions>
<general>
- Start from the previous state and apply changes from the messages.
- Watch for: characters entering/exiting, position changes, mood shifts, outfit changes.
- Remove characters who have left the scene. Add characters who have entered.
</general>
<outfit_tracking>
- If clothing is removed, set that slot to null.
- Add removed clothing to location props (handled separately, just set slot to null here).
- Do NOT suffix with '(off)', '(removed)' - just set to null.
- Be specific about partially removed items: 'white panties (pulled aside)'.
- Track which foot if only one shoe/sock remains.
</outfit_tracking>
<position_and_mood>
- Update positions as characters move.
- Update moods based on dialogue, reactions, internal thoughts.
- Update dispositions as relationships evolve.
</position_and_mood>
<pruning>
- Update goals as they're achieved or abandoned.
- Clear physical states that have resolved.
- Keep dispositions current - remove outdated feelings, add new ones.
</pruning>
</instructions>

<current_location>
{{location}}
</current_location>

<previous_characters>
{{previousCharacters}}
</previous_characters>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
${JSON.stringify(CHARACTERS_SCHEMA, null, 2)}
</schema>

<output_example>
${CHARACTERS_EXAMPLE}
</output_example>

Extract updated characters as valid JSON array:`;

// ============================================
// Public API
// ============================================

export async function extractCharacters(
  isInitial: boolean,
  messages: string,
  location: LocationState,
  userInfo: string,
  characterInfo: string,
  previousCharacters: Character[] | null,
  abortSignal?: AbortSignal
): Promise<Character[]> {
  const settings = getSettings();

  const locationStr = `${location.area} - ${location.place} (${location.position})`;

  let prompt: string;

  if (isInitial) {
    prompt = CHARACTERS_INITIAL_PROMPT
      .replace('{{userInfo}}', userInfo)
      .replace('{{characterInfo}}', characterInfo)
      .replace('{{location}}', locationStr)
      .replace('{{messages}}', messages);
  } else {
    prompt = CHARACTERS_UPDATE_PROMPT
      .replace('{{location}}', locationStr)
      .replace('{{previousCharacters}}', JSON.stringify(previousCharacters, null, 2))
      .replace('{{messages}}', messages);
  }

  const llmMessages: Message[] = [
    { role: 'system', content: 'You are a character state analysis agent for roleplay scenes. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ];

  const response = await makeGeneratorRequest(
    llmMessages,
    settings.profileId,
    settings.maxResponseTokens,
    abortSignal
  );

  return validateCharacters(parseJsonResponse(response));
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
          temperature: 0.7,
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

  // For characters, we expect an array
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('[BlazeTracker/Characters] Failed to parse response:', e);
    console.error('[BlazeTracker/Characters] Response was:', response);
    throw new Error('Failed to parse characters extraction response as JSON');
  }
}

function validateCharacters(data: any): Character[] {
  if (!Array.isArray(data)) {
    throw new Error('Invalid characters: expected array');
  }

  return data.map(validateCharacter);
}

function validateCharacter(data: any): Character {
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid character: missing name');
  }

  if (!data.position || typeof data.position !== 'string') {
    throw new Error(`Invalid character ${data.name}: missing position`);
  }

  // Ensure mood is an array
  let mood = data.mood;
  if (!Array.isArray(mood)) {
    mood = mood ? [mood] : ['neutral'];
  }
  mood = mood.slice(0, 5);

  // Validate outfit
  const outfit = validateOutfit(data.outfit);

  return {
    name: data.name,
    position: data.position,
    activity: typeof data.activity === 'string' ? data.activity : undefined,
    goals: Array.isArray(data.goals) ? data.goals : [],
    mood,
    physicalState: Array.isArray(data.physicalState) ? data.physicalState.slice(0, 5) : undefined,
    outfit,
    dispositions: validateDispositions(data.dispositions),
  };
}

function validateOutfit(data: any): CharacterOutfit {
  if (!data || typeof data !== 'object') {
    return {
      head: null,
      jacket: null,
      torso: null,
      legs: null,
      underwear: null,
      socks: null,
      footwear: null,
    };
  }

  return {
    head: typeof data.head === 'string' ? data.head : null,
    jacket: typeof data.jacket === 'string' ? data.jacket : null,
    torso: typeof data.torso === 'string' ? data.torso : null,
    legs: typeof data.legs === 'string' ? data.legs : null,
    underwear: typeof data.underwear === 'string' ? data.underwear : null,
    socks: typeof data.socks === 'string' ? data.socks : null,
    footwear: typeof data.footwear === 'string' ? data.footwear : null,
  };
}

function validateDispositions(data: any): Record<string, string[]> | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const result: Record<string, string[]> = {};

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      result[key] = value.filter(v => typeof v === 'string').slice(0, 5);
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
