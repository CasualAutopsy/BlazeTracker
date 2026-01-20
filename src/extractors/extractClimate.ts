import type { ExtractedData } from 'sillytavern-utils-lib/types';
import type { Message } from 'sillytavern-utils-lib';
import { Generator } from 'sillytavern-utils-lib';
import { getSettings } from '../ui/settings';
import type { NarrativeDateTime } from '../types/state';
import type { LocationState } from './extractLocation';

const generator = new Generator();

// ============================================
// Types
// ============================================

export interface ClimateState {
  weather: 'sunny' | 'cloudy' | 'snowy' | 'rainy' | 'windy' | 'thunderstorm';
  temperature: number;
}

// ============================================
// Schema
// ============================================

export const CLIMATE_SCHEMA = {
  type: 'object',
  description: 'Current climate/weather conditions',
  additionalProperties: false,
  properties: {
    weather: {
      type: 'string',
      enum: ['sunny', 'cloudy', 'snowy', 'rainy', 'windy', 'thunderstorm'],
      description: 'The current weather in the locale (if characters are indoors, give the weather outdoors)'
    },
    temperature: {
      type: 'number',
      description: 'Current temperature in Fahrenheit (if characters are indoors, give the indoor temperature)'
    }
  },
  required: ['weather', 'temperature']
};

const CLIMATE_EXAMPLE = JSON.stringify({
  weather: 'rainy',
  temperature: 52
}, null, 2);

// ============================================
// Prompts
// ============================================

const CLIMATE_INITIAL_PROMPT = `Analyze this roleplay scene and determine the current climate/weather. You must only return valid JSON with no commentary.

<instructions>
- Determine the weather and temperature for this scene.
- Consider the narrative time and location to infer season and typical weather.
- Look for explicit weather mentions: rain, snow, sunshine, etc.
- Look for contextual clues: characters wearing coats, sweating, mentioning cold/heat.
- If characters are indoors, weather should be what it is outside, but temperature should be indoor temperature.
- Consider the hemisphere: December is winter in the northern hemisphere, summer in the southern.
- Temperature should be in Fahrenheit.
</instructions>

<narrative_time>
{{narrativeTime}}
</narrative_time>

<location>
{{location}}
</location>

<character_info>
{{characterInfo}}
</character_info>

<scene_messages>
{{messages}}
</scene_messages>

<schema>
${JSON.stringify(CLIMATE_SCHEMA, null, 2)}
</schema>

<output_example>
${CLIMATE_EXAMPLE}
</output_example>

Extract the climate as valid JSON:`;

const CLIMATE_UPDATE_PROMPT = `Analyze these roleplay messages and determine if the climate has changed. You must only return valid JSON with no commentary.

<instructions>
- Check if weather or temperature has changed since the previous state.
- Weather can change: storm rolling in, rain stopping, etc.
- Temperature can change: moving indoors/outdoors, time passing, heating/AC mentioned.
- Consider the current narrative time when inferring temperature changes.
- If characters moved indoors/outdoors, adjust temperature accordingly.
- Temperature should be in Fahrenheit.
</instructions>

<narrative_time>
{{narrativeTime}}
</narrative_time>

<current_location>
{{location}}
</current_location>

<previous_climate>
{{previousClimate}}
</previous_climate>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
${JSON.stringify(CLIMATE_SCHEMA, null, 2)}
</schema>

<output_example>
${CLIMATE_EXAMPLE}
</output_example>

Extract the current climate as valid JSON:`;

// ============================================
// Public API
// ============================================

export async function extractClimate(
  isInitial: boolean,
  messages: string,
  narrativeTime: NarrativeDateTime,
  location: LocationState,
  characterInfo: string,
  previousClimate: ClimateState | null,
  abortSignal?: AbortSignal
): Promise<ClimateState> {
  const settings = getSettings();

  const timeStr = formatNarrativeTime(narrativeTime);
  const locationStr = `${location.area} - ${location.place} (${location.position})`;

  let prompt: string;

  if (isInitial) {
    prompt = CLIMATE_INITIAL_PROMPT
      .replace('{{narrativeTime}}', timeStr)
      .replace('{{location}}', locationStr)
      .replace('{{characterInfo}}', characterInfo)
      .replace('{{messages}}', messages);
  } else {
    prompt = CLIMATE_UPDATE_PROMPT
      .replace('{{narrativeTime}}', timeStr)
      .replace('{{location}}', locationStr)
      .replace('{{previousClimate}}', JSON.stringify(previousClimate, null, 2))
      .replace('{{messages}}', messages);
  }

  const llmMessages: Message[] = [
    { role: 'system', content: 'You are a climate analysis agent for roleplay scenes. Return only valid JSON.' },
    { role: 'user', content: prompt }
  ];

  const response = await makeGeneratorRequest(
    llmMessages,
    settings.profileId,
    settings.maxResponseTokens,
    abortSignal
  );

  return validateClimate(parseJsonResponse(response));
}

// ============================================
// Internal: Helpers
// ============================================

function formatNarrativeTime(time: NarrativeDateTime): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? 'AM' : 'PM';
  const minuteStr = String(time.minute).padStart(2, '0');

  return `${time.dayOfWeek}, ${monthNames[time.month - 1]} ${time.day}, ${time.year} at ${hour12}:${minuteStr} ${ampm}`;
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
          temperature: 0.3,
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
    console.error('[BlazeTracker/Climate] Failed to parse response:', e);
    console.error('[BlazeTracker/Climate] Response was:', response);
    throw new Error('Failed to parse climate extraction response as JSON');
  }
}

const VALID_WEATHER = ['sunny', 'cloudy', 'snowy', 'rainy', 'windy', 'thunderstorm'] as const;

function validateClimate(data: any): ClimateState {
  const weather = VALID_WEATHER.includes(data.weather) ? data.weather : 'sunny';
  const temperature = typeof data.temperature === 'number'
    ? Math.round(Math.max(-100, Math.min(150, data.temperature)))
    : 70;

  return { weather, temperature };
}
