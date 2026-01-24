// ============================================
// Prompt Configuration System
// ============================================

// Adjust this import path based on your project structure:
import { getSettings } from '../settings';

// ============================================
// Prompt Types
// ============================================

export type PromptKey =
	| 'time_datetime'
	| 'time_delta'
	| 'location_initial'
	| 'location_update'
	| 'climate_initial'
	| 'climate_update'
	| 'characters_initial'
	| 'characters_update'
	| 'scene_initial'
	| 'scene_update'
	| 'event_extract'
	| 'chapter_boundary'
	| 'relationship_initial'
	| 'relationship_update'
	| 'milestone_description';

export interface PromptPlaceholder {
	name: string;
	description: string;
	example: string;
}

export interface PromptDefinition {
	key: PromptKey;
	name: string;
	description: string;
	placeholders: PromptPlaceholder[];
	default: string;
	defaultTemperature: number;
}

export interface CustomPrompts {
	[key: string]: string;
}

// ============================================
// Placeholder Documentation
// ============================================

const COMMON_PLACEHOLDERS: Record<string, PromptPlaceholder> = {
	messages: {
		name: '{{messages}}',
		description: 'Recent roleplay messages formatted as "Name: message content"',
		example: 'Elena: *She walked into the bar*\n\nMarcus: "You made it."',
	},
	characterInfo: {
		name: '{{characterInfo}}',
		description: 'Character name and description (only on initial extraction)',
		example: 'Name: Elena\nDescription: A cunning thief with a heart of gold...',
	},
	userInfo: {
		name: '{{userInfo}}',
		description: 'User persona name and description (only on initial extraction)',
		example: 'Name: Marcus\nDescription: A grizzled detective...',
	},
	previousState: {
		name: '{{previousState}}',
		description: 'JSON of the previous state for this extractor',
		example: '{ "area": "Downtown", "place": "Bar", ... }',
	},
	schema: {
		name: '{{schema}}',
		description: 'JSON schema defining the expected output format',
		example: '{ "type": "object", "properties": { ... } }',
	},
	schemaExample: {
		name: '{{schemaExample}}',
		description: 'Example output matching the schema',
		example: '{ "area": "Downtown Seattle", ... }',
	},
	narrativeTime: {
		name: '{{narrativeTime}}',
		description: 'Current narrative time as formatted string',
		example: 'Monday, June 15, 2024 at 2:30 PM',
	},
	location: {
		name: '{{location}}',
		description: 'Current location summary',
		example: 'Downtown Seattle - The Rusty Nail bar (Corner booth)',
	},
	currentTime: {
		name: '{{currentTime}}',
		description: 'Current narrative time for context',
		example: 'Monday, June 15, 2024 at 2:30 PM',
	},
	charactersSummary: {
		name: '{{charactersSummary}}',
		description: 'Brief summary of characters present with moods/activities',
		example: 'Elena: anxious, hopeful - Watching the door\nMarcus: scheming - Drinking wine',
	},
	currentRelationships: {
		name: '{{currentRelationships}}',
		description: 'Current relationship states between characters',
		example: 'Elena & Marcus (complicated): Elena feels trusting, hopeful; Marcus feels suspicious, curious',
	},
	currentEvents: {
		name: '{{currentEvents}}',
		description: 'Recent events in the current chapter',
		example: '- Marcus revealed his true identity\n- Elena agreed to help with the heist',
	},
	chapterSummaries: {
		name: '{{chapterSummaries}}',
		description: 'Summaries of previous chapters',
		example: 'Chapter 1: Elena and Marcus meet at the bar...',
	},
	milestoneType: {
		name: '{{milestoneType}}',
		description: 'The type of milestone to describe (e.g., first_kiss, first_embrace)',
		example: 'first_kiss',
	},
	characterPair: {
		name: '{{characterPair}}',
		description: 'The two characters involved in the milestone',
		example: 'Elena and Marcus',
	},
	timeOfDay: {
		name: '{{timeOfDay}}',
		description: 'The time of day when the milestone occurred',
		example: 'evening',
	},
	props: {
		name: '{{props}}',
		description: 'Nearby objects/props in the scene',
		example: 'worn leather couch, coffee table, dim lamp',
	},
	characters: {
		name: '{{characters}}',
		description: 'Character positions, moods, and attire',
		example: 'Elena: Position: sitting on couch | Mood: nervous, hopeful | Wearing: torso: blue dress',
	},
	relationship: {
		name: '{{relationship}}',
		description: 'Current relationship status and feelings between characters',
		example: 'Elena & Marcus (close): Elena feels: trusting, attracted | Marcus feels: protective, conflicted',
	},
	eventDetail: {
		name: '{{eventDetail}}',
		description: 'Specific detail about what happened (e.g., what secret was shared)',
		example: "Elena's past as a thief",
	},
};

// ============================================
// Default Prompts
// ============================================

export const DEFAULT_PROMPTS: Record<PromptKey, PromptDefinition> = {
	time_datetime: {
		key: 'time_datetime',
		name: 'Time - Initial DateTime',
		description: 'Extracts the narrative date and time from the scene opening',
		defaultTemperature: 0.3,
		placeholders: [
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze this roleplay scene opening and determine the narrative date and time. You must only return valid JSON with no commentary.

<instructions>
- Determine the date and time when this scene takes place.
- Look for explicit mentions: "Monday morning", "3pm", "June 15th", "winter evening", etc.
- Look for contextual clues: weather, lighting, activities, meals, seasons.
- If the year is not specified, infer from context or use a reasonable modern year.
- If the month is not specified, infer from seasonal/weather clues or use a reasonable default.
- If the day is not specified, use a reasonable default (e.g., 15 for mid-month).
- Always provide complete values for all fields - never omit anything.
- Use 24-hour format for the hour field.
</instructions>

<examples>
<example>
<input>
*The first snow of the season was falling outside the coffee shop window, fat flakes drifting lazily under the streetlights. Elena wrapped her hands around her pumpkin spice latte, watching the evening crowd hurry past with their collars turned up against the cold. It was barely past five, but the sun had already set—one of those November days that made her wish she'd moved somewhere warmer.*

*Her phone buzzed: a text from Marcus saying he was running late, stuck in traffic from the corporate holiday party he'd been dreading all week. She smiled and texted back that she'd order him something warm. The barista had just put up the Christmas decorations—a little early, but Elena didn't mind. The twinkling lights reflected off the dark window, making the shop feel cozy despite the chill creeping in around the door frame.*
</input>
<output>
{
  "year": 2024,
  "month": 11,
  "day": 15,
  "hour": 17,
  "minute": 15,
  "period": "evening",
  "season": "late autumn"
}
</output>
<explanation>
EXPLICIT clues:
- "first snow of the season" + "November days" → month is 11 (November)
- "barely past five, but the sun had already set" → hour is 17 (5 PM), early sunset confirms late autumn
- "evening crowd" → period is "evening"

INFERRED values:
- year: Not specified, use current/reasonable modern year (2024)
- day: Not specified, default to mid-month (15)
- minute: "barely past five" suggests just after the hour (15)
- season: "late autumn" - November with first snow, not quite winter yet

Context clues that CONFIRM the inference:
- Pumpkin spice latte (seasonal fall drink)
- Corporate holiday party (November-December timing)
- Christmas decorations going up early (pre-December)
- Cold weather, collars turned up
</explanation>
</example>

<example>
<input>
*The summer sun blazed overhead as Marcus hauled the last cooler out of the truck bed. It was barely noon, but the Fourth of July heat was already oppressive—had to be pushing ninety-five in the shade, if there'd been any shade to speak of. The beach parking lot shimmered with heat mirages, and he could feel the asphalt burning through his sandals.*

*Down by the water, Elena and the kids had already claimed their spot, the red-white-and-blue umbrella visible even from here. She waved, and he could see Sophie jumping up and down with excitement, probably begging to go in the water before lunch. He checked his phone—12:17—and started the long trudge across the sand.*
</input>
<output>
{
  "year": 2024,
  "month": 7,
  "day": 4,
  "hour": 12,
  "minute": 17,
  "period": "midday",
  "season": "summer"
}
</output>
<explanation>
EXPLICIT clues:
- "Fourth of July" → month: 7, day: 4
- "barely noon" and "12:17" on phone → hour: 12, minute: 17
- "summer sun" → season: "summer"

INFERRED values:
- year: Not specified, use reasonable modern year (2024)
- period: "midday" - noon timeframe

Context clues that CONFIRM:
- Extreme heat (95°F) typical of July
- Beach trip with family (common July 4th activity)
- Patriotic umbrella colors (holiday-appropriate)
</explanation>
</example>

<example>
<input>
*The cherry blossoms were in full bloom along the Potomac, their delicate pink petals drifting down like snow onto the jogging path. Elena stretched her calves against a park bench, watching the early morning runners pass by in the golden dawn light. It was the perfect time of year for this—not too hot yet, the air fresh and cool, the city just starting to wake up.*

*Her fitness tracker showed 6:47 AM and a respectable heart rate after her warm-up. In the distance, she could see the Washington Monument catching the first rays of sunlight, and beyond it, the dome of the Capitol building. A few dog walkers ambled past, coffee cups in hand, taking advantage of the quiet before the tourist crowds arrived.*
</input>
<output>
{
  "year": 2024,
  "month": 4,
  "day": 8,
  "hour": 6,
  "minute": 47,
  "period": "early morning",
  "season": "spring"
}
</output>
<explanation>
EXPLICIT clues:
- "cherry blossoms in full bloom" → late March to mid-April (peak bloom in DC)
- "6:47 AM" on fitness tracker → hour: 6, minute: 47
- "early morning runners" + "golden dawn light" → period: "early morning"

INFERRED values:
- year: Modern year (2024) - Washington Monument, fitness tracker suggest contemporary
- month: 4 (April) - cherry blossom peak season
- day: 8 - mid-peak bloom period, reasonable default
- season: "spring" - cherry blossoms, "not too hot yet," fresh cool air

Location clues (Washington DC) help date the cherry blossoms specifically - they bloom late March through mid-April there.
</explanation>
</example>
</examples>

<scene_opening>
{{messages}}
</scene_opening>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the narrative date and time as valid JSON:`,
	},

	time_delta: {
		key: 'time_delta',
		name: 'Time - Delta',
		description: 'Determines how much narrative time has passed in the messages',
		defaultTemperature: 0.3,
		placeholders: [
			COMMON_PLACEHOLDERS.currentTime,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze these roleplay messages and determine how much narrative time has passed. You must only return valid JSON with no commentary.

<instructions>
- Determine how much time passes WITHIN these messages based on their actual content.
- The example output below is just showing the JSON format - do NOT copy its values.
- Look for explicit time jumps: "an hour later", "after a few minutes", "the next morning".
- Look for implicit time passage: travel, sleeping, waiting, activities with known durations.
- If the messages are just dialogue or immediate action with no time skip, return small values (0-2 minutes).
- Estimate based on what actually happens in the messages:
  * Pure dialogue exchange: 1-2 minutes
  * Walking somewhere nearby: 5-15 minutes
  * Driving across town: 15-45 minutes
  * Napping: 1-3 hours (consider currentTime)
  * Sleeping overnight: 6-10 hours (consider currentTime)
  * "A few minutes": 3-5 minutes
  * "A while": 15-30 minutes
  * "Some time": 30-60 minutes
- Be conservative - if unsure, prefer smaller time jumps.
- Return 0 for all fields if no time has passed.
</instructions>

<examples>
<example>
<current_time>Tuesday, March 12, 2024 at 10:30 PM</current_time>
<input>
*Elena yawned and stretched, her eyes heavy after the long day. The movie credits were rolling on the TV, but neither of them had really been watching for the last half hour.*

Elena: "I should probably head to bed. Early meeting tomorrow."

Marcus: "Yeah, me too." *He clicked off the TV and stood, offering her a hand.* "I'll lock up."

*They made their way upstairs, taking turns in the bathroom. By the time Elena had finished her skincare routine and climbed into bed, Marcus was already half-asleep, the lamp on his side still on.*

Elena: *turning off the lamp* "Night."

Marcus: *mumbling* "Night..."

*The morning sun streaming through a gap in the curtains woke Elena before her alarm. She blinked at the clock—6:47 AM—and groaned. Still thirteen minutes before she actually needed to be up. Beside her, Marcus was snoring softly, completely dead to the world.*
</input>
<output>
{
  "days": 0,
  "hours": 8,
  "minutes": 17
}
</output>
<explanation>
This is an OVERNIGHT time skip:
- currentTime: 10:30 PM Tuesday
- They went to bed shortly after (maybe 15-20 min for bathroom routine)
- Elena wakes at 6:47 AM
- Total elapsed: approximately 8 hours 17 minutes

The scene explicitly moves from "heading to bed" at night to "morning sun" waking her at 6:47 AM. We calculate from 10:30 PM to 6:47 AM = 8h 17m.

Key indicators of overnight skip:
- Going to bed at night
- "Morning sun streaming through curtains"
- Specific wake-up time given (6:47 AM)
- "Before her alarm" implies morning routine starting
</explanation>
</example>

<example>
<current_time>Saturday, June 8, 2024 at 2:15 PM</current_time>
<input>
*The argument had been building for twenty minutes now, voices rising with each exchange. Elena stood by the window, arms crossed, while Marcus paced the length of the living room.*

Marcus: "I just don't understand why you didn't tell me about the job offer!"

Elena: "Because I knew you'd react exactly like this!"

Marcus: "Like what? Like someone who thought we made decisions together?"

*Elena flinched. That one landed. She turned away from him, staring out at the street below without really seeing it.*

Elena: "I haven't even decided if I'm taking it yet."

Marcus: "But you're considering it. You're considering moving across the country and you didn't think that was worth mentioning?"

*The silence stretched between them, heavy and painful. Finally, Elena spoke, her voice smaller than before.*

Elena: "I was scared. I didn't know how to bring it up."

Marcus: *sighing heavily, running a hand through his hair* "I just... I need a minute." *He grabbed his jacket from the couch.* "I'm going for a walk."

*The door closed behind him with a quiet click that somehow felt louder than all the shouting.*
</input>
<output>
{
  "days": 0,
  "hours": 0,
  "minutes": 25
}
</output>
<explanation>
This is REAL-TIME dialogue with stated duration:
- "The argument had been building for twenty minutes now" establishes base time
- The rest of the exchange takes another ~5 minutes of heated dialogue
- Total: approximately 25 minutes

NO time skip occurs - this is a continuous scene. The time represents:
- 20 minutes of prior argument (mentioned)
- ~5 minutes of the dialogue we see
- Marcus leaving at the end

Key principle: Emotional conversations feel longer but don't actually take much clock time. An intense 5-minute argument can feel like an hour.
</explanation>
</example>

<example>
<current_time>Monday, September 16, 2024 at 9:00 AM</current_time>
<input>
*Elena grabbed her laptop bag and headed for the door, already running late for the presentation.*

Elena: "I'll see you tonight!"

Marcus: *from the kitchen* "Good luck! You've got this!"

*The commute was brutal—an accident on the highway had traffic backed up for miles. Elena spent forty-five minutes crawling along, mentally rehearsing her talking points and trying not to check the clock every thirty seconds. By the time she finally pulled into the parking garage, she had exactly three minutes to get upstairs.*

*She power-walked through the lobby, badge already in hand, and caught the elevator just as the doors were closing. The conference room was on the twelfth floor. She watched the numbers climb with growing anxiety—8, 9, 10, 11, 12—and practically sprinted down the hallway when the doors opened.*

*She slid into the conference room at 9:58 AM, two minutes before her slot. Her boss raised an eyebrow but said nothing. Elena set up her laptop with slightly shaking hands and took a deep breath. She'd made it.*
</input>
<output>
{
  "days": 0,
  "hours": 0,
  "minutes": 58
}
</output>
<explanation>
Time skip with EXPLICIT endpoint:
- Starts: 9:00 AM (currentTime, she's "already running late")
- Ends: 9:58 AM (explicitly stated - "slid into the conference room at 9:58 AM")
- Total: 58 minutes

Breakdown of time passage:
- Brief goodbye at home: 1-2 min
- 45 minutes of commute (explicitly stated)
- Parking, walking, elevator: ~10 min
- Total checks out: 2 + 45 + 10 ≈ 57-58 minutes

When EXACT times are given, use them for precision rather than estimating.
</explanation>
</example>

<bad_example>
<current_time>Tuesday, March 12, 2024 at 10:30 PM</current_time>
<input>
*Elena yawned...* [overnight sleep scene] *...woke at 6:47 AM*
</input>
<output>
{
  "days": 1,
  "hours": 0,
  "minutes": 0
}
</output>
<why_bad>
- Used "days: 1" but only 8 hours passed (10:30 PM to 6:47 AM)
- Should be: days: 0, hours: 8, minutes: 17
- "Next day" doesn't mean 24 hours - calculate actual elapsed time
- Always compute from current_time to the scene's end time
</why_bad>
</bad_example>
</examples>

<current_time>
{{currentTime}}
</current_time>

<messages>
{{messages}}
</messages>

<schema>
{{schema}}
</schema>

<output_format_example>
{{schemaExample}}
</output_format_example>

Based on the actual content of the messages above, extract the time delta as valid JSON:`,
	},

	location_initial: {
		key: 'location_initial',
		name: 'Location - Initial',
		description: 'Extracts location from the scene opening',
		defaultTemperature: 0.5,
		placeholders: [
			COMMON_PLACEHOLDERS.characterInfo,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze this roleplay scene and extract the current location. You must only return valid JSON with no commentary.

<instructions>
- Determine where this scene takes place.
- The 'area' should be neighborhood + city + country/region (e.g. 'Downtown, Huntsville, AL', 'Farringdon, London, UK', 'Mordor, Middle Earth', 'Ponyville, Equestria'). Always include the country or region identifier.
- The 'place' should be a SPECIFIC named location:
  - For buildings: Use FULL proper names (e.g. 'Pixar Animation Studios' NOT just 'Studio', 'The Rusty Nail Bar' NOT just 'Bar')
  - For outdoor/street locations: Use street name + nearby landmark (e.g. 'Ferris Street (near Zenith nightclub)', 'Central Park West (by the fountain)', 'Baker Street (outside 221B)')
  - NEVER use generic descriptions like 'Nightclub in a busy district' or 'Street in the city' - always invent a specific name
- The 'position' should be a SPATIAL location within the place (e.g. 'Main lobby', 'Corner booth', 'Sidewalk near entrance'). Do NOT include character poses or actions in position.
- Props rules (IMPORTANT):
  - Props are PHYSICAL OBJECTS that characters could pick up or interact with
  - Each prop should be ONE SINGLE ITEM (e.g. "Neon sign" not "Neon signs reflecting in puddles")
  - NO sounds, smells, or atmosphere (e.g. NOT "Bass thumping" or "Smell of smoke")
  - NO people or their activities (e.g. NOT "Smokers huddled by door" or "Idling taxis")
  - NO clothing that characters are currently WEARING - that goes in character outfits
  - Only include clothing as props if REMOVED and placed somewhere (e.g. "Discarded jacket on chair")
- If location is not explicit, infer from context clues and INVENT specific names that fit the setting.
</instructions>

<examples>
<example>
<input>
Elena: *She pushed through the revolving door into the Meridian Grand Hotel, shaking raindrops from her umbrella. The lobby stretched before her in all its art deco glory—geometric patterns in the marble floor, brass fixtures polished to a mirror shine, and a massive crystal chandelier casting prismatic light across the space. A string quartet played something classical near the fountain, their music competing with the murmur of well-dressed guests and the occasional ding of elevator arrivals.*

*She spotted the concierge desk to her left, staffed by a woman in an immaculate uniform, and beyond it the entrance to what looked like a high-end restaurant. The check-in counter dominated the far wall, where a short queue of travelers waited with their luggage. Elena's heels clicked against the marble as she made her way toward the seating area near the windows, where oversized leather armchairs surrounded low coffee tables scattered with magazines.*

"Impressive," *she murmured, taking in the fifteen-foot ceilings and the gallery of black-and-white photographs lining the walls.*
</input>
<output>
{
  "area": "Downtown, Chicago, IL",
  "place": "Meridian Grand Hotel",
  "position": "Main lobby near window seating area",
  "props": ["Crystal chandelier", "Art deco marble floor", "Brass fixtures", "Fountain with string quartet nearby", "Oversized leather armchairs", "Low coffee tables with magazines", "Black-and-white photograph gallery"]
}
</output>
<explanation>
- area: Inferred as major city with grand hotels; "Downtown, Chicago, IL" includes neighborhood + city + state
- place: Full proper name "Meridian Grand Hotel" extracted exactly as mentioned, not abbreviated to "Hotel" or "The Meridian"
- position: "Main lobby near window seating area" - describes WHERE she is spatially, not WHAT she's doing (no "walking" or "taking in the view")
- props: Selected the most scene-relevant items that characters might interact with. Excluded transient elements (the queue of travelers, the concierge herself) and focused on environmental features. Note specificity: "Art deco marble floor" not just "floor"
</explanation>
</example>

<example>
<input>
*The submarine's control room was cramped and humid, every surface covered in switches, dials, and screens displaying sonar readouts. Captain Reyes stood at the periscope station, one eye pressed to the viewfinder while her XO monitored the depth gauge nearby. Red emergency lighting bathed everything in an ominous glow—they'd been running silent for six hours now, and the tension was palpable.*

*Banks of monitors showed the surrounding ocean in ghostly green sonar imagery. The helm station dominated the front of the room, where two junior officers sat rigid at their controls. Overhead, pipes and cables snaked across the ceiling, occasionally dripping condensation onto the metal deck plates below. A navigation chart was spread across the plotting table, weighted down with coffee mugs and a brass compass.*

*The air recycler hummed its constant drone, barely masking the distant ping of active sonar from somewhere above them.*

Reyes: "Maintain current depth. Nobody makes a sound."
</input>
<output>
{
  "area": "Pacific Ocean, 200 meters depth",
  "place": "USS Triton (Attack Submarine)",
  "position": "Control room",
  "props": ["Periscope station", "Sonar display monitors", "Helm control stations", "Navigation plotting table with charts", "Brass compass", "Depth gauge", "Red emergency lighting", "Overhead pipe network", "Air recycler"]
}
</output>
<explanation>
- area: For mobile locations like vehicles/vessels, area describes the broader environment ("Pacific Ocean, 200 meters depth")
- place: Vessel name inferred as military submarine; given a reasonable designation. Full name includes vessel type for clarity
- position: "Control room" - the specific compartment, not "standing at periscope" or "running silent"
- props: Focused on interactive/notable equipment. Excluded people (XO, junior officers) and temporary states (coffee mugs as weights). Included atmospheric elements (red lighting, air recycler) that affect scene mood
</explanation>
</example>

<example>
<input>
*Marcus found himself in what had clearly once been a grand ballroom, though decades of neglect had transformed it into something out of a gothic nightmare. Faded murals peeled from the walls in long strips, revealing water-stained plaster beneath. The parquet floor, once polished to a gleam, was now warped and broken in places, with weeds pushing through the gaps where it met the crumbling baseboards.*

*Dust motes danced in the shafts of pale light filtering through broken windows high above. A massive fireplace dominated one wall, its marble mantle cracked and blackened with old soot. Someone had dragged a mattress into the corner—recent, by the look of it, with rumpled blankets and empty food cans scattered nearby. Graffiti covered the lower portions of the walls, tags and crude drawings layered over each other.*

*The remnants of a crystal chandelier lay shattered in the center of the room, its brass frame twisted and tarnished. Marcus could hear pigeons cooing somewhere in the rafters above, and the distant sound of traffic from the street outside.*
</input>
<output>
{
  "area": "Old Town, Baltimore, MD",
  "place": "Abandoned Harrington Estate",
  "position": "Former grand ballroom",
  "props": ["Peeling murals and water-stained walls", "Warped parquet floor with weeds", "Cracked marble fireplace (blackened)", "Recent mattress with blankets in corner", "Empty food cans", "Layered graffiti", "Shattered crystal chandelier (brass frame on floor)", "Broken high windows"]
}
</output>
<explanation>
- area: "Old Town, Baltimore, MD" - specific district + city + state inferred from context of historic estate
- place: Named estate rather than just "abandoned building" - gives the location identity and history
- position: "Former grand ballroom" - spatial designation with context about what the room was/is
- props: Mixed permanent features (fireplace, floor) with signs of decay (peeling murals, shattered chandelier) AND evidence of recent habitation (mattress, food cans). Props tell the story of the location. Note state descriptors: "cracked," "blackened," "shattered"
</explanation>
</example>

<example>
<input>
*The bass from the club behind them was still audible, a muffled thump-thump-thump that vibrated through the pavement. Elena stepped out into the cool night air, grateful to escape the crush of bodies inside. The street was quiet at this hour—just a few smokers huddled near the entrance and a taxi idling at the curb.*

*Across the street, a kebab shop's neon sign flickered on and off, casting red and blue shadows on the wet pavement. The rain had stopped, but puddles still dotted the sidewalk, reflecting the glow of the streetlamps. A bouncer in a black jacket stood by the velvet rope, checking his phone while a couple argued nearby about whose turn it was to call an Uber.*

*Elena pulled her jacket tighter against the chill and walked a few steps away from the crowd, past a shuttered newsagent and a graffiti-covered electrical box. The smell of cigarette smoke and frying meat mixed in the air.*
</input>
<output>
{
  "area": "Shoreditch, London, UK",
  "place": "Kingsland Road (outside Vinyl Dreams nightclub)",
  "position": "Sidewalk near shuttered newsagent",
  "props": ["Kebab shop neon sign", "Streetlamp", "Velvet rope", "Electrical box", "Newsagent shutters"]
}
</output>
<explanation>
- area: "Shoreditch, London, UK" - specific neighborhood + city + country, inferred from nightclub culture context
- place: "Kingsland Road (outside Vinyl Dreams nightclub)" - specific street name + nearby landmark, NOT generic "Street near nightclub" or "Outside a club"
- position: "Sidewalk near shuttered newsagent" - spatial location on the street
- props: ONLY physical objects characters could interact with. Each is ONE item. Excludes: people (bouncer, smokers), sounds (bass), atmosphere (puddles, reflections), worn clothing
</explanation>
</example>

<bad_example>
<output>
{
  "area": "City",
  "place": "Hotel",
  "position": "Walking through the lobby, looking around nervously while shaking off her umbrella"
}
</output>
<why_bad>
- area too vague: Should include neighborhood + city + state/country ("Downtown, Chicago, IL" not "City")
- place too generic: Should use the full proper name ("Meridian Grand Hotel" not "Hotel")
- position contains actions: "Walking through," "looking around nervously," and "shaking off umbrella" are character actions, not spatial locations. Should be "Main lobby" or "Lobby entrance"
</why_bad>
</bad_example>

<bad_example>
<output>
{
  "area": "London",
  "place": "Nightclub in a busy district",
  "position": "Outside near the entrance, under a flickering streetlamp"
}
</output>
<why_bad>
- area missing neighborhood and country: Should be "Shoreditch, London, UK" or "Soho, London, UK" - not just the city name
- place is a generic description, not a specific name: "Nightclub in a busy district" should be a specific place like "Kingsland Road (outside Vinyl Dreams)" or "Greek Street (near The Blue Note)"
- Always invent specific place names when not provided - never use generic descriptions
</why_bad>
</bad_example>

<bad_example>
<output>
{
  "area": "Downtown, Seattle, WA",
  "place": "The Blue Moon Lounge",
  "position": "Main bar area",
  "props": ["Leather bar stools", "Neon signs", "Elena's red cocktail dress", "Marcus's gray suit jacket", "Martini glasses"]
}
</output>
<why_bad>
- props include clothing characters are WEARING: "Elena's red cocktail dress" and "Marcus's gray suit jacket" should NOT be in props - they belong in each character's outfit slots
- Only include clothing in props if it has been REMOVED and placed somewhere (e.g., "Marcus's suit jacket on barstool", "Discarded scarf near entrance")
- Clothing that characters are currently wearing goes in character outfit tracking, not location props
</why_bad>
</bad_example>

<bad_example>
<output>
{
  "area": "Shoreditch, London, UK",
  "place": "Kingsland Road (outside Vinyl Dreams)",
  "position": "Sidewalk near entrance",
  "props": ["Flickering neon signs reflecting in puddles", "Bass thumping from nightclub entrance", "Smokers huddled by the door", "Idling taxis", "Clara's limited edition hat", "Matt's designer hoodie"]
}
</output>
<why_bad>
- "Flickering neon signs reflecting in puddles" combines multiple things - should be separate: "Neon sign" (puddles are not props)
- "Bass thumping from nightclub entrance" is a SOUND, not a physical object - do not include sounds/atmosphere
- "Smokers huddled by the door" and "Idling taxis" are PEOPLE and their activities - do not include people as props
- "Clara's limited edition hat" and "Matt's designer hoodie" are clothing characters are WEARING - belongs in character outfits, not props
- Correct props would be: "Neon sign", "Velvet rope", "Club entrance door", "Electrical box"
</why_bad>
</bad_example>
</examples>

<character_info>
{{characterInfo}}
</character_info>

<scene_messages>
{{messages}}
</scene_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the location as valid JSON:`,
	},

	location_update: {
		key: 'location_update',
		name: 'Location - Update',
		description: 'Updates location based on recent messages',
		defaultTemperature: 0.5,
		placeholders: [
			COMMON_PLACEHOLDERS.previousState,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze these roleplay messages and extract any location changes. You must only return valid JSON with no commentary.

<instructions>
- Determine if the location has changed from the previous state.
- Track any movement: characters entering new rooms, traveling, position changes within a space.
- The 'area' should be neighborhood + city + country/region (e.g. 'Downtown, Huntsville, AL', 'Farringdon, London, UK'). Always include country/region.
- The 'place' should be a SPECIFIC named location:
  - For buildings: Use FULL proper names (e.g. 'Meridian Grand Hotel' not 'Hotel')
  - For outdoor/street locations: Use street name + nearby landmark (e.g. 'Kingsland Road (outside Vinyl Dreams nightclub)')
  - NEVER use generic descriptions - always use or invent specific names
- The 'position' should be a SPATIAL location only (e.g. 'Corner booth', 'Kitchen', 'Sidewalk near entrance'). Do NOT include character poses or actions.
- Props rules (IMPORTANT):
  - Props are PHYSICAL OBJECTS that characters could pick up or interact with
  - Each prop should be ONE SINGLE ITEM (e.g. "Neon sign" not "Neon signs reflecting in puddles")
  - NO sounds, smells, or atmosphere (e.g. NOT "Bass thumping" or "Smell of smoke")
  - NO people or their activities (e.g. NOT "Smokers huddled by door")
  - NO clothing that characters are currently WEARING - that goes in character outfits
  - Only include clothing as props if REMOVED and placed somewhere (e.g. "Discarded jacket on chair")
- Update props: new items introduced, items picked up/removed, items changing state.
- If no location change occurred, return the previous location but consider prop changes.
- Be careful to track items that have been picked up (remove from props) or put down (add to props).
</instructions>

<examples>
<example>
<input>
*Elena finally let herself relax, kicking off her heels with a relieved sigh. They tumbled across the hardwood floor, coming to rest near the closet door. She shrugged out of her blazer and tossed it carelessly onto the armchair by the window, then padded over to the bed and flopped down face-first into the pillows.*

*After a moment, she rolled onto her back and stared at the ceiling, her stockinged feet hanging off the edge of the mattress. The room was quiet except for the soft hum of the air conditioning and the muffled sounds of city traffic from far below. She reached over to the nightstand and grabbed her phone, scrolling through messages she'd been ignoring all day.*

*The afternoon light filtered through the sheer curtains, casting long shadows across the Persian rug. Her laptop sat open on the desk across the room, screen dark but charging light blinking steadily. She should probably check her work email, but the thought made her groan and bury her face in the nearest pillow instead.*
</input>
<previous_location>
{
  "area": "Upper East Side, Manhattan, NY",
  "place": "Elena's Apartment (Unit 12B)",
  "position": "Entryway",
  "props": ["Coat rack", "Mirror", "Small table with keys bowl", "Umbrella stand"]
}
</previous_location>
<output>
{
  "area": "Upper East Side, Manhattan, NY",
  "place": "Elena's Apartment (Unit 12B)",
  "position": "Master bedroom",
  "props": ["Queen bed with pillows", "Nightstand with phone charger", "Armchair by window with discarded blazer", "Black heels near closet door", "Persian rug", "Desk with laptop (charging)", "Sheer curtains", "Air conditioning unit"]
}
</output>
<explanation>
- position: Changed from "Entryway" to "Master bedroom" - she moved rooms. Note we don't say "lying on bed" (that's her pose, not her location)
- props completely replaced: When moving to a new room, previous room's props (coat rack, mirror, etc.) are no longer relevant - we only track props in the CURRENT location
- Removed clothing added to props: "Black heels near closet door" and "Armchair by window with discarded blazer" - both include WHERE the items ended up
- New room props identified: Items she interacts with (bed, nightstand, phone) plus environmental details (rug, curtains, laptop) that could become relevant
- State noted where relevant: "laptop (charging)" because the blinking light was mentioned and could matter
</explanation>
</example>

<example>
<input>
*The storm had gotten worse since they'd arrived. Marcus stood at the cabin window, watching lightning illuminate the forest in staccato bursts. Rain hammered against the glass so hard he could feel the vibration through the frame. Behind him, Elena had gotten the old wood stove going—it crackled and popped, slowly pushing back against the chill that had seeped into the abandoned structure.*

*She'd found some moth-eaten blankets in the closet and spread them on the dusty floor near the stove, creating a makeshift camp. Their wet jackets hung from nails in the wall, dripping steadily onto the warped floorboards. Marcus had dragged in some firewood from the covered porch, stacking it near the door where it could dry out.*

*The cabin was sparse—just the one room with a rusted kitchenette in the corner and what might have once been a bed frame, now just bare springs and rotten wood. But it had a roof that mostly didn't leak, and right now that was enough.*

Elena: "Come sit by the fire. You're not going to make the storm stop by glaring at it."
</input>
<previous_location>
{
  "area": "Cascade Mountains, Washington",
  "place": "Forest Trail",
  "position": "Rocky outcropping (seeking shelter)",
  "props": ["Dense pine trees", "Trail marker", "Loose rocks", "Marcus's backpack"]
}
</previous_location>
<output>
{
  "area": "Cascade Mountains, Washington",
  "place": "Abandoned Ranger Cabin",
  "position": "Main room",
  "props": ["Wood stove (lit, crackling)", "Moth-eaten blankets on floor near stove", "Wet jackets hanging on wall nails", "Firewood stack by door", "Rain-streaked window", "Rusted kitchenette", "Broken bed frame", "Covered porch (exterior)"]
}
</output>
<explanation>
- area: Stays the same - they're still in the same mountain region
- place: Changed from "Forest Trail" to "Abandoned Ranger Cabin" - they found shelter and moved indoors
- position: "Main room" - simple spatial designation. NOT "standing at window" or "by the fire"
- props transformation: Trail props completely replaced with cabin interior. Note we track:
  * Items they brought/affected: "Wet jackets hanging on wall nails", "Firewood stack by door"
  * Environmental features: "Wood stove (lit, crackling)", "Rain-streaked window"
  * Potential interaction points: "Rusted kitchenette", "Broken bed frame", "Moth-eaten blankets"
  * Connected spaces: "Covered porch (exterior)" mentioned for context since firewood came from there
- State descriptors matter: "lit, crackling" for the stove, "wet" for jackets, "rusted" and "broken" for damaged items
</explanation>
</example>

<example>
<input>
*Sarah carefully set down her coffee cup, leaving a ring on the manuscript pages scattered across the table. The interview had been going for nearly an hour now, and the small conference room felt increasingly claustrophobic. Detective Morrison sat across from her, his recorder blinking red between them, while his partner leaned against the wall by the door—blocking the exit, Sarah noted.*

*The fluorescent lights buzzed overhead, one of them flickering intermittently in a way that was slowly driving her crazy. Someone had tried to make the room less institutional with a potted plant in the corner, but it was clearly fake and covered in dust. The blinds were drawn, cutting off any view of the bullpen outside, though she could hear phones ringing and people talking through the thin walls.*

*Morrison slid another photograph across the table—the third one in the last ten minutes. Sarah forced herself not to react, keeping her hands flat on the cool surface of the table. The chair was deliberately uncomfortable, she realized. Everything about this room was designed to make people want to leave, to say whatever would get them out fastest.*
</input>
<previous_location>
{
  "area": "Downtown Precinct",
  "place": "Central Police Station",
  "position": "Main lobby waiting area",
  "props": ["Plastic chairs", "Vending machines", "Bulletin board with wanted posters", "Front desk with duty officer"]
}
</previous_location>
<output>
{
  "area": "Downtown Precinct",
  "place": "Central Police Station",
  "position": "Interview Room B",
  "props": ["Metal table with scattered manuscript pages", "Coffee cup (with ring stain)", "Audio recorder (recording)", "Photographs (evidence)", "Uncomfortable metal chairs", "Flickering fluorescent lights", "Dusty fake plant in corner", "Drawn window blinds", "Single door (blocked by detective)"]
}
</output>
<explanation>
- area/place: Unchanged - still in same building, just different room
- position: Changed from "Main lobby waiting area" to "Interview Room B" - specific room designation inferred from context (police station interview rooms are typically lettered/numbered)
- props completely refreshed for new room:
  * Interview-specific items: "Audio recorder (recording)", "Photographs (evidence)", "Metal table with scattered manuscript pages"
  * Items characters placed: "Coffee cup (with ring stain)" - detail matters for scene continuity
  * Environmental/atmospheric: "Flickering fluorescent lights", "Uncomfortable metal chairs", "Dusty fake plant"
  * Tactical note: "Single door (blocked by detective)" - relevant to scene tension even though it involves a character's position
- Previous room props (vending machines, bulletin board, etc.) completely removed - not in current location
</explanation>
</example>

<bad_example>
<output>
{
  "area": "Downtown Precinct",
  "place": "Central Police Station",
  "position": "Sitting nervously across from the detective, trying to stay calm",
  "props": ["Plastic chairs", "Vending machines", "Bulletin board", "Audio recorder", "Photographs"]
}
</output>
<why_bad>
- position contains character state: "Sitting nervously" and "trying to stay calm" are character poses and emotions, not spatial locations. Should be "Interview Room B" or "Conference room"
- props mixed from two rooms: "Plastic chairs" and "Vending machines" were in the lobby, not the interview room. When location changes, props should COMPLETELY update to the new room
- props lack state/context: "Audio recorder" should note "(recording)", "Photographs" should note "(evidence)" for scene relevance
</why_bad>
</bad_example>
</examples>

<previous_location>
{{previousState}}
</previous_location>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the current location as valid JSON:`,
	},

	climate_initial: {
		key: 'climate_initial',
		name: 'Climate - Initial',
		description: 'Extracts weather and temperature from scene opening',
		defaultTemperature: 0.3,
		placeholders: [
			COMMON_PLACEHOLDERS.narrativeTime,
			COMMON_PLACEHOLDERS.location,
			COMMON_PLACEHOLDERS.characterInfo,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze this roleplay scene and determine the current climate/weather. You must only return valid JSON with no commentary.

<instructions>
- Determine the weather and temperature for this scene.
- Consider the narrative time and location to infer season and typical weather.
- Look for explicit weather mentions: rain, snow, sunshine, etc.
- Look for contextual clues: characters wearing coats, sweating, mentioning cold/heat.
- If characters are indoors, weather should be what it is outside, but temperature should be indoor temperature.
- Consider the hemisphere: December is winter in the northern hemisphere, summer in the southern.
- Temperature should be in Fahrenheit.
</instructions>

<examples>
<example>
<narrative_time>Wednesday, January 15, 2024 at 7:30 PM</narrative_time>
<location>Minneapolis, Minnesota - Elena's Apartment (Living room)</location>
<input>
*Elena pressed her forehead against the cold window, watching the snow pile up on the fire escape outside. The forecast had warned about this—the worst blizzard in a decade, they said. Already the cars parked on the street below were nothing but white lumps, and the wind was howling loud enough to hear through the double-paned glass.*

*She pulled her cardigan tighter and retreated to the couch, where Marcus had made a nest of blankets. The radiator was clanking away in the corner, working overtime, but it could only do so much against a Minnesota winter.*

Marcus: "Power company says to expect outages tonight." *He held up his phone.* "I filled the bathtub just in case."

Elena: "Smart." *She curled up against him, stealing his warmth.* "I'm glad I'm not trying to drive in this."

*Another gust of wind rattled the windows, and somewhere in the building, a door slammed.*
</input>
<output>
{
  "weather": "Heavy snowfall with blizzard conditions, strong winds",
  "temperature": 68
}
</output>
<explanation>
WEATHER: Explicitly described - "worst blizzard in a decade," heavy snow visible on cars/fire escape, howling wind, windows rattling.

TEMPERATURE: 68°F - This is INDOOR temperature:
- They're inside the apartment (living room)
- Radiator is "working overtime" but "can only do so much"
- Elena is cold enough to pull cardigan tighter and seek Marcus's warmth
- 68°F represents a slightly cool but still heated indoor space during a blizzard
- Outside would be well below freezing (single digits or negative), but we report indoor temp since they're indoors

Key principle: When characters are indoors, report indoor temperature but outdoor weather. The weather affects the scene (visible through windows, wind rattling them) but temperature should reflect their immediate environment.
</explanation>
</example>

<example>
<narrative_time>Saturday, August 3, 2024 at 2:15 PM</narrative_time>
<location>Phoenix, Arizona - Desert Botanical Garden (Main pathway)</location>
<input>
*The heat was absolutely brutal. Marcus could feel sweat soaking through his shirt within minutes of leaving the air-conditioned visitor center. The sun beat down from a cloudless sky, reflecting off the pale gravel paths until he had to squint even with sunglasses.*

*Elena had insisted on seeing the saguaro collection, and he'd agreed before checking the weather. 115 degrees, the sign at the entrance had warned. Even the cacti looked like they were struggling. They passed a family heading back toward the buildings, the kids red-faced and whining, one of them being carried.*

Elena: *fanning herself with the park map* "Maybe we should have done this in the morning."

Marcus: "You think?" *He pointed to a shaded ramada up ahead.* "Let's at least get out of direct sun."

*They hurried to the shade, but it barely helped. The air itself felt like an oven, shimmering over the desert landscape in visible waves.*
</input>
<output>
{
  "weather": "Clear, cloudless, extreme sun exposure",
  "temperature": 115
}
</output>
<explanation>
WEATHER: "Clear, cloudless, extreme sun exposure"
- "cloudless sky" explicitly stated
- Emphasis on brutal direct sunlight
- No moisture, no clouds, no relief

TEMPERATURE: 115°F - OUTDOOR temperature:
- Explicitly stated on the entrance sign
- They're outdoors on the garden pathway
- Multiple heat indicators: soaking sweat, squinting, kids overheating, shimmering air
- This is actual ambient temperature, not just "feels like"

Phoenix in August commonly hits 115°F+. The scene confirms extreme heat through physical reactions (sweating through shirt, seeking shade desperately) and environmental details (shimmering air, heat waves).
</explanation>
</example>

<example>
<narrative_time>Friday, October 18, 2024 at 6:45 PM</narrative_time>
<location>Portland, Oregon - Waterfront Park (Riverside path)</location>
<input>
*The rain had been falling steadily all afternoon, the kind of gray Pacific Northwest drizzle that wasn't heavy enough for an umbrella but somehow still got you soaked. Elena pulled up the hood of her rain jacket and fell into step beside Marcus, their boots splashing through shallow puddles on the riverside path.*

*The Willamette River was high and fast-moving, swollen with runoff. Across the water, the lights of downtown Portland glowed soft and hazy through the mist. A few other hardy souls were out walking—joggers, mostly, seemingly immune to the weather.*

Marcus: "I love this, you know." *He spread his arms, letting the rain hit his face.* "Everyone else hides from it, but this is real Portland."

Elena: "You're insane." *But she was smiling.* "My socks are going to be wet for days."

*A gust of wind blew spray off the river, adding to the general dampness. The temperature had dropped since sunset, and Elena could see her breath now, thin wisps of vapor disappearing into the gray.*
</input>
<output>
{
  "weather": "Steady light rain, misty, overcast",
  "temperature": 48
}
</output>
<explanation>
WEATHER: "Steady light rain, misty, overcast"
- "Gray Pacific Northwest drizzle" - classic description of light but persistent rain
- "Mist" explicitly mentioned (downtown visible but hazy)
- Rain steady enough to soak through clothes over time
- Overcast implied by gray sky, no sun mentioned

TEMPERATURE: 48°F - OUTDOOR temperature:
- They're outside on the riverside path
- Cool enough to see breath ("thin wisps of vapor")
- Temperature "dropped since sunset" - evening in October
- 48°F is typical for Portland in October evening with rain
- Not cold enough for winter gear, but uncomfortable when wet

Note the difference from indoor scenes: here we track actual outdoor temperature since they're outside in the weather.
</explanation>
</example>
</examples>

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
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the climate as valid JSON:`,
	},

	climate_update: {
		key: 'climate_update',
		name: 'Climate - Update',
		description: 'Updates weather/temperature based on recent messages',
		defaultTemperature: 0.3,
		placeholders: [
			COMMON_PLACEHOLDERS.narrativeTime,
			COMMON_PLACEHOLDERS.location,
			COMMON_PLACEHOLDERS.previousState,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze these roleplay messages and determine if the climate has changed. You must only return valid JSON with no commentary.

<instructions>
- Check if weather or temperature has changed since the previous state.
- Weather can change: storm rolling in, rain stopping, etc.
- Temperature can change: moving indoors/outdoors, time passing, heating/AC mentioned.
- Consider the current narrative time when inferring temperature changes.
- If characters moved indoors/outdoors, adjust temperature accordingly.
- Temperature should be in Fahrenheit.
</instructions>

<examples>
<example>
<narrative_time>Saturday, August 3, 2024 at 2:45 PM</narrative_time>
<location>Phoenix, Arizona - Desert Botanical Garden (Visitor Center cafe)</location>
<previous_climate>
{
  "weather": "Clear, cloudless, extreme sun exposure",
  "temperature": 115
}
</previous_climate>
<input>
*The air conditioning hit them like a wall of blessed relief as they pushed through the visitor center doors. Marcus stood just inside the entrance for a moment, arms spread, letting the cool air wash over his sweat-soaked shirt.*

Marcus: "I'm never leaving this building."

Elena: *laughing* "Dramatic." *She made a beeline for the water fountain, drinking deeply.* "But also same."

*The cafe was sparsely populated—most sensible people had either come in the early morning or stayed home entirely. They found a table by the window, where they could watch the heat shimmer outside without being in it. A ceiling fan rotated lazily overhead, adding to the refrigerated chill.*

Elena: "I think my skin is still radiating heat."

Marcus: "Well, the sign says it's 72 in here, so you should cool down eventually." *He nodded toward a digital temperature display on the wall.*
</input>
<output>
{
  "weather": "Clear, cloudless, extreme sun exposure",
  "temperature": 72
}
</output>
<explanation>
WEATHER: UNCHANGED - "Clear, cloudless, extreme sun exposure"
- They moved indoors, but weather outside hasn't changed
- Still visible through the window (heat shimmer)
- Weather tracks outdoor conditions even when characters are inside

TEMPERATURE: 115°F → 72°F - CHANGED due to moving indoors
- Explicitly stated on digital display: 72°F
- Strong AC indicated by "blessed relief" and "refrigerated chill"
- Dramatic contrast between outdoor heat and indoor comfort
- Temperature tracks characters' immediate environment

This is the key indoor/outdoor distinction: when characters move inside, temperature changes to reflect their environment, but weather remains the outdoor condition.
</explanation>
</example>

<example>
<narrative_time>Wednesday, January 15, 2024 at 11:30 PM</narrative_time>
<location>Minneapolis, Minnesota - Elena's Apartment (Living room)</location>
<previous_climate>
{
  "weather": "Heavy snowfall with blizzard conditions, strong winds",
  "temperature": 68
}
</previous_climate>
<input>
*The power had gone out two hours ago. Elena and Marcus huddled together on the couch under every blanket they owned, their breath visible in the flashlight beam. The radiator had gone cold and silent, and the temperature was dropping fast.*

*Outside, the storm had intensified—if that was even possible. The wind was screaming now, a constant howl that made the old building creak and groan. Through the frosted window, Elena couldn't even see the building across the street anymore, just a wall of swirling white.*

Marcus: *checking his phone* "Still no update on when power's coming back."

Elena: *shivering* "How cold do you think it is in here now?"

Marcus: "I'd guess low fifties? The pipes are going to freeze if this keeps up."

*She pulled the blankets tighter, pressing herself against him. At least body heat was free.*
</input>
<output>
{
  "weather": "Severe blizzard, whiteout conditions, dangerously high winds",
  "temperature": 52
}
</output>
<explanation>
WEATHER: Updated from "Heavy snowfall with blizzard conditions" → "Severe blizzard, whiteout conditions, dangerously high winds"
- Storm has intensified ("if that was even possible")
- Visibility now zero (can't see building across street)
- Wind upgraded from "strong" to "screaming" and "constant howl"
- Weather can change during scenes; track these updates

TEMPERATURE: 68°F → 52°F - DROPPED due to power outage
- Power out for 2 hours, radiator cold
- Breath now visible indoors (wasn't before)
- Marcus estimates "low fifties"
- Temperature dropping because heating failed
- Still indoor temp, but indoor conditions have changed dramatically

Both fields changed this time: weather intensified AND indoor temperature dropped. Track each independently based on what the scene describes.
</explanation>
</example>

<example>
<narrative_time>Friday, October 18, 2024 at 9:30 PM</narrative_time>
<location>Portland, Oregon - Marcus's House (Enclosed back porch)</location>
<previous_climate>
{
  "weather": "Steady light rain, misty, overcast",
  "temperature": 48
}
</previous_climate>
<input>
*The rain had finally stopped, though water still dripped from the gutters and the trees in Marcus's backyard. Elena stood on the enclosed back porch, a mug of tea warming her hands, watching the clouds break apart to reveal patches of stars.*

Marcus: *joining her* "Hey, look at that—you can actually see the moon."

*It was true. The clouds were moving fast, pushed by upper-level winds, and a three-quarter moon was emerging from behind them. The air felt cleaner now, washed fresh by the rain, though it had gotten noticeably colder since the sky cleared.*

Elena: "It's beautiful. But cold." *She pulled her sweater sleeves down over her hands.* "Probably thirty degrees colder than when we were at the waterfront."

Marcus: "Clear skies do that. All the heat radiates away." *He put an arm around her.* "Want to go back inside?"

Elena: "In a minute. I want to see if we can spot any constellations."
</input>
<output>
{
  "weather": "Clear and clearing, post-rain, partial moon visible",
  "temperature": 45
}
</output>
<explanation>
WEATHER: "Steady light rain, misty, overcast" → "Clear and clearing, post-rain, partial moon visible"
- Rain stopped (major change)
- Clouds breaking up, moon and stars visible
- "Post-rain" captures the recent weather context (water dripping, fresh air)

TEMPERATURE: 48°F → 45°F - SLIGHT drop
- They're on an ENCLOSED porch (semi-outdoor)
- Clear skies = radiative cooling (Marcus explains this)
- Elena notes it's "noticeably colder" since clouds cleared
- ~3°F drop is realistic for clearing skies in evening
- Not as cold as fully outdoors would be, but cooler than inside

The enclosed porch is a middle ground - affected by outdoor temperature but somewhat sheltered. Temperature reflects this semi-outdoor environment.
</explanation>
</example>
</examples>

<narrative_time>
{{narrativeTime}}
</narrative_time>

<current_location>
{{location}}
</current_location>

<previous_climate>
{{previousState}}
</previous_climate>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the current climate as valid JSON:`,
	},

	characters_initial: {
		key: 'characters_initial',
		name: 'Characters - Initial',
		description: 'Extracts all character states from scene opening',
		defaultTemperature: 0.7,
		placeholders: [
			COMMON_PLACEHOLDERS.userInfo,
			COMMON_PLACEHOLDERS.characterInfo,
			COMMON_PLACEHOLDERS.location,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze this roleplay scene and extract all character states. You must only return valid JSON with no commentary.

<instructions>
<general>
- Extract all characters present in the scene.
- For each character, determine their position, activity, mood, physical state, and outfit.
- Make reasonable inferences where information is not explicit.
</general>
<outfit_rules>
- Consider whether the character would usually wear clothes (ponies, Pokémon, animals typically don't).
- For non-clothed species, return null for all outfit slots unless explicitly dressed.
- Be specific: 't-shirt' not 'default top' or 'unspecified top'.
- Include underwear/socks with reasonable assumptions for clothed characters.
- Fur, scales, and other anatomy do NOT count as outfit items.
- If clothing is described as removed or off, set that slot to null.
- neck slot: necklaces, chokers, scarves, ties, collars.
- back slot: backpacks, quivers, cloaks, capes, messenger bags, holsters.
</outfit_rules>
</instructions>

<examples>
<example>
<input>
*The coffee shop was quiet for a Monday morning. Elena sat in her usual corner booth, laptop open but ignored as she stared out the rain-streaked window. She'd thrown on her favorite oversized cardigan over a simple white tank top before leaving the apartment, paired with the worn jeans she always reached for on days when she needed comfort. Her hair was still damp from the shower, pulled back in a messy ponytail that dripped occasionally onto her shoulders.*

*She wrapped both hands around her latte, letting the warmth seep into her fingers. The shop's AC was cranked too high, as usual, and she wished she'd worn something warmer. Her phone buzzed on the table—probably Marcus again—but she couldn't bring herself to look at it yet. Instead, she watched a businessman outside struggle with his umbrella in the wind, his expensive suit getting splattered despite his efforts.*

*Her laptop pinged with a new email notification. Work. Always work. Elena sighed and finally pulled the computer closer, resigned to dealing with whatever crisis had erupted overnight. Her reading glasses were somewhere in her bag, but she didn't feel like digging for them.*
</input>
<output>
[{
  "name": "Elena",
  "position": "Corner booth by window",
  "activity": "Reluctantly checking work emails, holding latte",
  "mood": ["melancholy", "reluctant", "tired"],
  "physicalState": ["cold", "damp hair"],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": "Oversized cardigan",
    "back": null,
    "torso": "White tank top",
    "legs": "Worn comfortable jeans",
    "underwear": "Cotton bra and panties",
    "socks": "Ankle socks",
    "footwear": "Canvas sneakers"
  }
}]
</output>
<explanation>
- position: "Corner booth by window" - spatial location extracted from "usual corner booth" and "stared out the window"
- activity: Combines her current action (checking emails) with physical detail (holding latte) to paint the scene
- mood: Multiple moods captured - "melancholy" from window staring, "reluctant" from avoiding phone/emails, "tired" from overall tone
- physicalState: "cold" (AC too high, wished for warmer clothes) and "damp hair" (still wet from shower)
- outfit inference reasoning:
  * jacket: "Oversized cardigan" explicitly mentioned
  * torso: "White tank top" explicitly mentioned
  * legs: "Worn jeans" explicitly mentioned, added "comfortable" based on context about comfort-seeking
  * underwear: NOT mentioned, but inferred as "Cotton bra and panties" - simple, practical choice matching the casual comfort-focused outfit. A tank top requires a bra; the casual vibe suggests cotton over lace
  * socks: NOT mentioned, but inferred as "Ankle socks" - jeans typically worn with socks; casual outfit suggests simple ankle socks
  * footwear: NOT mentioned, but inferred as "Canvas sneakers" - casual comfort outfit + rainy day + jeans strongly suggests sneakers over heels or sandals
  * neck: null - no neckwear mentioned or contextually implied
  * back: null - she's sitting in a cafe, no bag/backpack mentioned
- Key principle: NEVER use "unspecified" or "unknown" - always make a reasonable inference based on the outfit style, occasion, and character context
</explanation>
</example>

<example>
<input>
*Detective Morrison entered the precinct looking like he hadn't slept in days—which, to be fair, he hadn't. His tie was loosened, top button undone, and his usually crisp white dress shirt had developed a concerning coffee stain near the pocket. The shoulder holster was visible under his rumpled gray suit jacket, service weapon a familiar weight against his ribs.*

*He tossed his badge on the desk and dropped into his chair with a groan, the old springs protesting loudly. Three days on this case and they were no closer to finding the girl. The case files were still spread across his desk from last night, photos and reports mixed together in organized chaos that only made sense to him.*

*His partner Chen looked up from her own desk, raising an eyebrow at his disheveled state. She was, as always, immaculately put together—pressed navy blazer, hair in a perfect bun, not a wrinkle in sight. How she managed it on the same hours he was working remained one of life's great mysteries.*

Morrison: "Don't say it."
Chen: "Wasn't going to say anything." *She slid a fresh coffee across the desk toward him.* "You look like hell, by the way."
</input>
<output>
[{
  "name": "Morrison",
  "position": "At his desk",
  "activity": "Just arrived, accepting coffee from partner",
  "mood": ["exhausted", "frustrated", "grimly determined"],
  "physicalState": ["sleep-deprived", "disheveled"],
  "outfit": {
    "head": null,
    "neck": "Loosened striped tie",
    "jacket": "Rumpled gray suit jacket",
    "back": null,
    "torso": "White dress shirt (coffee-stained, top button undone)",
    "legs": "Gray suit trousers",
    "underwear": "White undershirt, boxers",
    "socks": "Black dress socks",
    "footwear": "Black leather oxfords"
  }
},
{
  "name": "Chen",
  "position": "At her desk across from Morrison",
  "activity": "Offering coffee to partner, light teasing",
  "mood": ["alert", "professional", "slightly amused"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": "Simple gold chain necklace",
    "jacket": "Pressed navy blazer",
    "back": null,
    "torso": "White silk blouse",
    "legs": "Navy dress trousers",
    "underwear": "Seamless nude bra and panties",
    "socks": "Sheer nude knee-highs",
    "footwear": "Navy low heels"
  }
}]
</output>
<explanation>
TWO characters extracted - both detectives present in the scene.

Morrison:
- physicalState: "sleep-deprived" and "disheveled" - multiple states can coexist
- outfit details: State descriptors in parentheses - "(coffee-stained, top button undone)" for the shirt
- legs: "Gray suit trousers" inferred to match the "gray suit jacket" - suits come as sets
- underwear: "White undershirt, boxers" - male detective in a suit would typically wear an undershirt; boxers are standard professional default for men
- socks: "Black dress socks" - standard with suit and dark shoes
- footwear: "Black leather oxfords" - classic detective/professional male footwear, matches suit

Chen:
- mood includes "slightly amused" from her teasing
- outfit is described as immaculate/pressed - reflects personality
- torso: "White silk blouse" inferred - blazers typically worn over blouses in professional settings; silk matches her put-together appearance
- underwear: "Seamless nude bra and panties" - professional women often wear seamless undergarments under fitted clothing to avoid visible lines
- socks: "Sheer nude knee-highs" - professional women in trousers often wear knee-highs rather than full pantyhose for comfort
- footwear: "Navy low heels" - matches the navy blazer, professional but practical for detective work

Key inference principles:
1. Match underwear formality to outfit formality (silk blouse → nicer undergarments)
2. Consider practicality (detective work → low heels, not stilettos)
3. Color coordinate where logical (navy suit pieces together)
4. Account for gender norms in professional settings
</explanation>
</example>

<example>
<input>
*The Pikachu bounced excitedly around the Pokemon Center lobby, cheeks sparking with barely contained electricity. Its trainer, a young woman with bright pink hair, was trying desperately to calm it down before it short-circuited the healing machines again.*

Nurse Joy: "Perhaps some fresh air would help? The courtyard is lovely this time of day."

*The trainer—her name tag read 'Zoe'—sighed and scooped up the energetic electric mouse, tucking it under her arm like a fuzzy yellow football. She was dressed for travel: sturdy hiking boots, cargo shorts with about a million pockets, and a fitted black athletic top that had seen better days. A large backpack sat on the bench behind her, covered in patches from different gym badges and travel destinations.*

Zoe: "Sorry, he gets like this after battles. Too much energy and nowhere to put it."

*The Pikachu's ears twitched, and it let out a cheerful 'Pika!' before settling down slightly, though its tail still wagged against Zoe's hip.*
</input>
<output>
[{
  "name": "Pikachu",
  "position": "Being held under Zoe's arm",
  "activity": "Calming down after excitement, tail wagging",
  "mood": ["excited", "energetic", "happy"],
  "physicalState": ["excess electrical charge"],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": null,
    "legs": null,
    "underwear": null,
    "socks": null,
    "footwear": null
  }
},
{
  "name": "Zoe",
  "position": "Near Pokemon Center lobby bench",
  "activity": "Holding Pikachu, apologizing to Nurse Joy",
  "mood": ["exasperated", "apologetic", "fond"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": "Large travel backpack (on bench)",
    "torso": "Black fitted athletic top (worn)",
    "legs": "Cargo shorts with multiple pockets",
    "underwear": "Sports bra and athletic briefs",
    "socks": "Thick hiking socks",
    "footwear": "Sturdy hiking boots"
  }
},
{
  "name": "Nurse Joy",
  "position": "Behind Pokemon Center counter",
  "activity": "Suggesting the courtyard, being helpful",
  "mood": ["patient", "helpful", "professional"],
  "physicalState": [],
  "outfit": {
    "head": "Nurse cap",
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Pink nurse uniform dress",
    "legs": "Pink nurse uniform dress",
    "underwear": "White practical bra and panties",
    "socks": "White knee-high stockings",
    "footwear": "White nursing shoes"
  }
}]
</output>
<explanation>
THREE characters extracted, including the Pokemon:

Pikachu (non-human):
- ALL outfit slots are null - Pokemon don't wear clothes by default
- physicalState: "excess electrical charge" - this IS tracked for non-humans as it's a relevant physical condition
- mood still tracked normally - Pokemon have emotions

Zoe (Pokemon trainer):
- outfit matches "dressed for travel" description with practical/athletic theme
- underwear: "Sports bra and athletic briefs" - inferred from athletic top and active lifestyle. Someone in hiking gear and athletic wear would wear athletic undergarments, not lace
- socks: "Thick hiking socks" - hiking boots require substantial socks; this is a practical inference
- State descriptor "(worn)" added to athletic top since text mentioned "had seen better days"

Nurse Joy (uniform character):
- Iconic uniform character - nurse cap, pink dress, white accessories
- torso AND legs both list "Pink nurse uniform dress" - it's a single garment covering both
- underwear: "White practical bra and panties" - professional medical setting suggests practical, likely white to not show under uniform
- socks: "White knee-high stockings" - traditional nurse uniform includes white stockings
- footwear: "White nursing shoes" - comfortable, professional medical footwear

Key species principle: Pokemon, animals, and non-humanoid creatures get null for ALL outfit slots unless they're explicitly wearing something (like a Pokemon costume or accessory). But they still have mood and physicalState.
</explanation>
</example>

<bad_example>
<output>
[{
  "name": "Elena",
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": "Cardigan",
    "back": null,
    "torso": "Tank top",
    "legs": "Jeans",
    "underwear": "Unspecified undergarments",
    "socks": "Unknown",
    "footwear": "Shoes"
  }
}]
</output>
<why_bad>
- "Unspecified undergarments" and "Unknown" are NEVER acceptable - always infer based on outfit style and context
- Outfit items lack detail: "Cardigan" should be "Oversized cardigan", "Tank top" should be "White tank top", "Jeans" should be "Worn comfortable jeans"
- "Shoes" is too vague - specify the type based on outfit context (sneakers, heels, boots, etc.)
- Missing state descriptors where relevant
- Should infer: casual outfit = cotton underwear, ankle socks, canvas sneakers
</why_bad>
</bad_example>
</examples>

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
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract all characters as valid JSON array:`,
	},

	characters_update: {
		key: 'characters_update',
		name: 'Characters - Update',
		description: 'Updates character states based on recent messages',
		defaultTemperature: 0.7,
		placeholders: [
			COMMON_PLACEHOLDERS.location,
			COMMON_PLACEHOLDERS.previousState,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze these roleplay messages and update character states. You must only return valid JSON with no commentary.

<instructions>
<general>
- Start from the previous state and apply changes from the messages.
- Watch for: characters entering/exiting, position changes, mood shifts, outfit changes.
</general>
<presence_tracking>
CRITICAL: Track which characters are PRESENT in the scene.

REMOVE characters who have LEFT:
- Walked out of the building/location entirely
- Went to another room AND closed the door behind them
- Drove/ran/walked away out of sight
- Any situation where POV character can no longer see or interact with them

ADD characters who have ENTERED:
- Arrived at the location (came home, walked in, etc.)
- Came into the room from elsewhere in the building
- Appeared/showed up in the scene

If a character leaves, they should NOT be in the output array.
If a character enters, ADD them with inferred state from context.
</presence_tracking>
<outfit_tracking>
- If clothing is removed, set that slot to null.
- Add removed clothing to location props (handled separately, just set slot to null here).
- Do NOT suffix with '(off)', '(removed)' - just set to null.
- Be specific about partially removed items: 'white panties (pulled aside)'.
- Track which foot if only one shoe/sock remains.
- neck slot: necklaces, chokers, scarves, ties, collars.
- back slot: backpacks, quivers, cloaks, capes, messenger bags.
</outfit_tracking>
<position_and_mood>
- Update positions as characters move.
- Update moods based on dialogue, reactions, internal thoughts.
</position_and_mood>
<pruning>
- Clear physical states that have resolved.
</pruning>
</instructions>

<examples>
<example>
<input>
*Elena stretched her arms over her head with a yawn, then reached down to unzip her boots. The left one came off easily, thudding to the floor beside the couch, but the right one's zipper stuck halfway. She muttered a curse and tugged harder until it finally gave way, sending her sock-clad foot free.*

*She wiggled her toes gratefully and pulled her legs up onto the cushions, tucking them beneath her. The blazer she'd been wearing all day felt suddenly suffocating, so she shrugged out of it and tossed it over the back of the couch. Much better. She loosened the top two buttons of her blouse, feeling like she could finally breathe.*

Marcus: *glancing up from his laptop* "Long day?"

Elena: "You have no idea." *She pulled the elastic from her hair, shaking her ponytail loose and running her fingers through it.* "Peterson had me in meetings from nine to six. I think I've permanently lost feeling in my feet."

*She rubbed her neck, tilting her head from side to side to work out the knots. The headache that had been building all afternoon was finally starting to fade now that she was home.*
</input>
<previous_state>
[{
  "name": "Elena",
  "position": "Standing in the entryway",
  "activity": "Just arriving home",
  "mood": ["tired", "stressed"],
  "physicalState": ["tension headache"],
  "outfit": {
    "head": "Hair in ponytail",
    "neck": "Pearl earrings and simple silver necklace",
    "jacket": "Charcoal gray blazer",
    "back": null,
    "torso": "White silk blouse",
    "legs": "Black pencil skirt",
    "underwear": "Nude seamless bra and panties",
    "socks": "Sheer black knee-highs",
    "footwear": "Black leather ankle boots"
  }
},
{
  "name": "Marcus",
  "position": "On the living room couch",
  "activity": "Working on laptop",
  "mood": ["focused", "relaxed"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Navy henley shirt",
    "legs": "Gray sweatpants",
    "underwear": "Boxer briefs",
    "socks": "White athletic socks",
    "footwear": null
  }
}]
</previous_state>
<output>
[{
  "name": "Elena",
  "position": "Curled up on the couch",
  "activity": "Decompressing, talking with Marcus",
  "mood": ["exhausted", "relieved", "comfortable"],
  "physicalState": ["sore feet", "neck tension", "headache fading"],
  "outfit": {
    "head": null,
    "neck": "Pearl earrings and simple silver necklace",
    "jacket": null,
    "back": null,
    "torso": "White silk blouse (top buttons undone)",
    "legs": "Black pencil skirt",
    "underwear": "Nude seamless bra and panties",
    "socks": "Sheer black knee-highs",
    "footwear": null
  }
},
{
  "name": "Marcus",
  "position": "On the living room couch",
  "activity": "Working on laptop, chatting with Elena",
  "mood": ["focused", "relaxed", "attentive"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Navy henley shirt",
    "legs": "Gray sweatpants",
    "underwear": "Boxer briefs",
    "socks": "White athletic socks",
    "footwear": null
  }
}]
</output>
<explanation>
Multiple changes tracked for Elena:

POSITION changed: "Standing in the entryway" → "Curled up on the couch" - she moved and changed posture

MOOD evolved: "tired, stressed" → "exhausted, relieved, comfortable" - same base tiredness but context shifted to being home

PHYSICAL STATE updated:
- "tension headache" → "headache fading" - still present but improving, as noted in text
- Added "sore feet" and "neck tension" - explicitly mentioned complaints

OUTFIT changes (4 items affected):
1. head: "Hair in ponytail" → null - she removed the elastic and let her hair down
2. jacket: "Charcoal gray blazer" → null - tossed over back of couch (FULLY removed = null)
3. torso: "White silk blouse" → "White silk blouse (top buttons undone)" - PARTIALLY changed, so we keep the item but add state descriptor
4. footwear: "Black leather ankle boots" → null - both boots removed (note: we don't need to track each boot separately since both were removed)

Items that did NOT change remain exactly as they were: legs, underwear, socks

Marcus: Minimal changes - just added "attentive" to mood since he asked about her day. Everything else unchanged.

Key principles demonstrated:
- Fully removed items → null (blazer, boots, hair elastic)
- Partially modified items → keep item with state descriptor (blouse with buttons undone)
- Hair accessories count as "head" slot
- Physical states can be updated/evolved, not just added/removed
</explanation>
</example>

<example>
<input>
*The rain had soaked through everything. Marcus peeled off his ruined leather jacket—beyond saving at this point—and dropped it in a wet heap by the door. His t-shirt underneath was plastered to his skin, and he grabbed the hem and pulled it over his head without ceremony, revealing the fresh bandage wrapped around his ribs.*

Elena: *eyes widening* "Jesus, what happened to you?"

Marcus: "Just a scratch." *He kicked off his waterlogged boots, grimacing as he put weight on his left ankle.* "The other guy looks worse."

*He limped toward the bathroom, leaving a trail of wet footprints on the hardwood. His jeans hung heavy with water, but he couldn't deal with those until he got somewhere with a towel. His socks squelched with every step—definitely ruined.*

Elena: "Marcus, that bandage is bleeding through. Sit down, let me look at it."

*He paused at the bathroom door, one hand braced against the frame. In the better lighting, Elena could see the bruise forming along his jaw and the split in his lip that was still seeping.*

Marcus: "I'm fine. Just need to dry off."
</input>
<previous_state>
[{
  "name": "Marcus",
  "position": "Outside, approaching the building",
  "activity": "Making his way home in the rain",
  "mood": ["determined", "pained"],
  "physicalState": ["injured ribs (bandaged)"],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": "Black leather jacket",
    "back": null,
    "torso": "Gray cotton t-shirt",
    "legs": "Dark blue jeans",
    "underwear": "Black boxer briefs",
    "socks": "Black crew socks",
    "footwear": "Brown leather boots"
  }
},
{
  "name": "Elena",
  "position": "In the apartment living room",
  "activity": "Waiting anxiously",
  "mood": ["worried", "anxious"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Oversized band t-shirt",
    "legs": "Cotton sleep shorts",
    "underwear": "Cotton panties, no bra",
    "socks": null,
    "footwear": null
  }
}]
</previous_state>
<output>
[{
  "name": "Marcus",
  "position": "At bathroom doorway",
  "activity": "Refusing medical attention, bracing against door frame",
  "mood": ["stubborn", "pained", "dismissive"],
  "physicalState": ["injured ribs (bandaged, bleeding through)", "sprained left ankle", "bruised jaw", "split lip (bleeding)", "soaking wet"],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": null,
    "legs": "Dark blue jeans (waterlogged)",
    "underwear": "Black boxer briefs",
    "socks": "Black crew socks (soaked, ruined)",
    "footwear": null
  }
},
{
  "name": "Elena",
  "position": "In the apartment living room",
  "activity": "Trying to get Marcus to accept help",
  "mood": ["alarmed", "worried", "frustrated"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Oversized band t-shirt",
    "legs": "Cotton sleep shorts",
    "underwear": "Cotton panties, no bra",
    "socks": null,
    "footwear": null
  }
}]
</output>
<explanation>
Significant changes to Marcus after a rough encounter:

POSITION: "Outside, approaching the building" → "At bathroom doorway" - tracked his movement through the scene

ACTIVITY: Updated to current action with posture detail

MOOD: "determined, pained" → "stubborn, pained, dismissive" - evolved based on his dialogue and refusal of help

PHYSICAL STATE (major updates):
- "injured ribs (bandaged)" → "injured ribs (bandaged, bleeding through)" - state worsened/more visible
- Added "sprained left ankle" - grimacing when putting weight on it
- Added "bruised jaw" - Elena sees it in better lighting
- Added "split lip (bleeding)" - seeping mentioned
- Added "soaking wet" - general state from rain

OUTFIT changes with STATE DESCRIPTORS:
- jacket: "Black leather jacket" → null - removed and dropped (described as ruined, but that's the location prop system's concern)
- torso: "Gray cotton t-shirt" → null - pulled off, revealing bandage
- legs: "Dark blue jeans" → "Dark blue jeans (waterlogged)" - NOT removed but state changed significantly
- socks: "Black crew socks" → "Black crew socks (soaked, ruined)" - still wearing them but state matters
- footwear: "Brown leather boots" → null - kicked off

Elena's changes are minor:
- mood: "worried, anxious" → "alarmed, worried, frustrated" - escalated upon seeing his condition
- activity: Updated to reflect her current action
- Everything else unchanged

Key principles:
- Use state descriptors for items affected but not removed: "(waterlogged)", "(soaked, ruined)"
- Physical states can stack - list all relevant conditions
- Update physical state descriptors when conditions change: "(bandaged)" → "(bandaged, bleeding through)"
- Track position changes through the scene
</explanation>
</example>

<example>
<input>
*The dance studio mirrors reflected their movements as Elena helped Sarah through the routine one more time. Sarah had finally gotten the hang of the footwork, her sneakers squeaking against the polished floor as she spun. But the August heat was brutal even with the AC running, and both women were feeling it.*

Elena: "Take five, you've earned it." *She grabbed her water bottle from the bench and took a long drink, then poured some over the back of her neck.* "God, it's like a sauna in here."

*Sarah flopped down onto the floor, sprawling on her back with her arms spread wide. She pulled her tank top away from her skin, fanning herself with the fabric.*

Sarah: "I don't know how you do this for a living. I'm dying."

*Elena laughed and sat down beside her, stretching her legs out. She reached down and pulled off her dance sneakers, peeling away the damp socks underneath and tossing them toward her bag. Her feet were red and sore from two hours of practice.*

Sarah: *sitting up and doing the same* "Yeah, okay, that's a good idea." *She kicked off her own sneakers but left her socks on, too tired to bother.*

*They sat in companionable silence for a moment, catching their breath. Elena pulled her damp sports bra strap away from her shoulder, unsticking it from her skin with a grimace.*
</input>
<previous_state>
[{
  "name": "Elena",
  "position": "Center of dance floor",
  "activity": "Teaching dance routine",
  "mood": ["patient", "encouraging", "focused"],
  "physicalState": ["sweating"],
  "outfit": {
    "head": "Hair in high bun",
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Black sports bra",
    "legs": "Gray yoga leggings",
    "underwear": "Athletic thong",
    "socks": "White no-show dance socks",
    "footwear": "Black dance sneakers"
  }
},
{
  "name": "Sarah",
  "position": "Center of dance floor",
  "activity": "Learning dance routine, practicing spins",
  "mood": ["determined", "slightly frustrated", "improving"],
  "physicalState": ["sweating", "tired"],
  "outfit": {
    "head": "Ponytail",
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Light blue tank top",
    "legs": "Black athletic shorts",
    "underwear": "Sports bra and boyshorts",
    "socks": "White ankle socks",
    "footwear": "White running sneakers"
  }
}]
</previous_state>
<output>
[{
  "name": "Elena",
  "position": "Sitting on dance floor near bench",
  "activity": "Taking a break, cooling off",
  "mood": ["relaxed", "amused", "overheated"],
  "physicalState": ["sweating heavily", "sore feet", "overheated"],
  "outfit": {
    "head": "Hair in high bun",
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Black sports bra (damp)",
    "legs": "Gray yoga leggings",
    "underwear": "Athletic thong",
    "socks": null,
    "footwear": null
  }
},
{
  "name": "Sarah",
  "position": "Sitting on dance floor",
  "activity": "Taking a break, recovering",
  "mood": ["exhausted", "relieved", "companionable"],
  "physicalState": ["sweating heavily", "exhausted", "overheated"],
  "outfit": {
    "head": "Ponytail",
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Light blue tank top (pulled away from skin)",
    "legs": "Black athletic shorts",
    "underwear": "Sports bra and boyshorts",
    "socks": "White ankle socks",
    "footwear": null
  }
}]
</output>
<explanation>
Both characters taking a break with different clothing changes:

ELENA:
- position: Moved from "Center of dance floor" to "Sitting on dance floor near bench"
- physicalState: Expanded from just "sweating" to "sweating heavily", "sore feet", "overheated" - conditions worsened/more detailed
- outfit changes:
  * torso: Added state "(damp)" - the sports bra is wet from sweat (pulling strap away from skin)
  * socks: "White no-show dance socks" → null - explicitly removed and tossed toward bag
  * footwear: "Black dance sneakers" → null - pulled off
  * head stays "Hair in high bun" - not mentioned as changed

SARAH:
- position: Changed to floor from standing/dancing
- physicalState: "sweating, tired" → "sweating heavily, exhausted, overheated" - more intense after practice
- outfit changes:
  * torso: Added state "(pulled away from skin)" - she's fanning herself with it
  * footwear: "White running sneakers" → null - kicked off
  * socks: UNCHANGED at "White ankle socks" - explicitly mentioned she left them on ("too tired to bother")

Key principles demonstrated:
- When text explicitly says someone DIDN'T remove something, keep it
- State descriptors for how clothing is currently being worn: "(pulled away from skin)"
- Physical states can intensify: "sweating" → "sweating heavily"
- Both characters can have outfit changes in the same message - track each separately
</explanation>
</example>

<example type="character_leaving">
<input>
*The argument had gone on long enough. Marcus slammed his palm against the table.*

Marcus: "I can't do this right now." *He pushed back from the table, chair scraping loudly against the floor.* "I need some air."

*Without waiting for a response, he grabbed his jacket from the back of the chair and strode toward the front door. Elena started to follow, but he held up a hand without turning around.*

Marcus: "Don't."

*The door opened, closed firmly behind him. Through the window, Elena watched him disappear down the street, his shoulders hunched against the cold night air.*

*Lily reached over and put a hand on Elena's arm.*

Lily: "Give him time. He'll come around."

Elena: *sinking back into her chair, voice hollow* "Will he though?"
</input>
<previous_state>
[{
  "name": "Marcus",
  "position": "At kitchen table",
  "activity": "Arguing with Elena",
  "mood": ["angry", "frustrated", "hurt"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Gray sweater",
    "legs": "Dark jeans",
    "underwear": "Boxer briefs",
    "socks": "Black socks",
    "footwear": "Boots"
  }
},
{
  "name": "Elena",
  "position": "At kitchen table",
  "activity": "Arguing with Marcus",
  "mood": ["defensive", "upset", "pleading"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Cream sweater",
    "legs": "Leggings",
    "underwear": "Bra and panties",
    "socks": "Fuzzy socks",
    "footwear": null
  }
},
{
  "name": "Lily",
  "position": "At kitchen table",
  "activity": "Witnessing the argument",
  "mood": ["uncomfortable", "worried"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Green cardigan over white tee",
    "legs": "Jeans",
    "underwear": "Bra and panties",
    "socks": "Ankle socks",
    "footwear": "Canvas sneakers"
  }
}]
</previous_state>
<output>
[{
  "name": "Elena",
  "position": "At kitchen table",
  "activity": "Processing Marcus leaving",
  "mood": ["defeated", "hurt", "hollow"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Cream sweater",
    "legs": "Leggings",
    "underwear": "Bra and panties",
    "socks": "Fuzzy socks",
    "footwear": null
  }
},
{
  "name": "Lily",
  "position": "At kitchen table",
  "activity": "Comforting Elena",
  "mood": ["sympathetic", "concerned"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Green cardigan over white tee",
    "legs": "Jeans",
    "underwear": "Bra and panties",
    "socks": "Ankle socks",
    "footwear": "Canvas sneakers"
  }
}]
</output>
<explanation>
CHARACTER LEAVING SCENE (3 → 2 characters):
- Marcus LEFT THE SCENE entirely (went out the front door, watched disappearing down street)
- He is REMOVED from the output array - do not include characters who have left
- His jacket was picked up but he left with it - this is NOT a prop left behind

Elena and Lily remain:
- Elena's mood shifted from "defensive, upset, pleading" → "defeated, hurt, hollow"
- Lily's activity updated to "Comforting Elena", mood shifted to "sympathetic, concerned"
- Both outfits unchanged

Key principle: When a character LEAVES (exits building, goes outside, walks away out of sight), REMOVE them from the array entirely.
</explanation>
</example>

<example type="character_leaving_room">
<input>
*The tension in the bedroom was suffocating. Sarah finally threw up her hands.*

Sarah: "I can't talk about this anymore tonight."

*She grabbed her phone from the nightstand and walked out of the bedroom, bare feet padding down the hallway. Jake heard the bathroom door close, then the lock click into place. A moment later, the shower started running.*

*Jake sat on the edge of the bed, staring at the empty doorway. His brother Mike, who had been awkwardly pretending to read in the corner armchair, finally looked up.*

Mike: "Dude... what did you do?"

Jake: "I don't want to talk about it."
</input>
<previous_state>
[{
  "name": "Jake",
  "position": "Sitting on edge of bed",
  "activity": "Having difficult conversation with Sarah",
  "mood": ["guilty", "defensive"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "White undershirt",
    "legs": "Pajama pants",
    "underwear": "Boxers",
    "socks": null,
    "footwear": null
  }
},
{
  "name": "Sarah",
  "position": "Standing by the window",
  "activity": "Confronting Jake",
  "mood": ["hurt", "angry", "exhausted"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Silk nightgown",
    "legs": null,
    "underwear": "Panties only",
    "socks": null,
    "footwear": null
  }
},
{
  "name": "Mike",
  "position": "In corner armchair",
  "activity": "Pretending to read, avoiding eye contact",
  "mood": ["uncomfortable", "awkward"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Old band t-shirt",
    "legs": "Basketball shorts",
    "underwear": "Boxers",
    "socks": null,
    "footwear": null
  }
}]
</previous_state>
<output>
[{
  "name": "Jake",
  "position": "Sitting on edge of bed",
  "activity": "Staring at empty doorway",
  "mood": ["guilty", "regretful", "closed off"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "White undershirt",
    "legs": "Pajama pants",
    "underwear": "Boxers",
    "socks": null,
    "footwear": null
  }
},
{
  "name": "Mike",
  "position": "In corner armchair",
  "activity": "Questioning Jake about what happened",
  "mood": ["concerned", "curious", "awkward"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Old band t-shirt",
    "legs": "Basketball shorts",
    "underwear": "Boxers",
    "socks": null,
    "footwear": null
  }
}]
</output>
<explanation>
CHARACTER LEAVING TO ANOTHER ROOM (3 → 2 characters):
- Sarah left the bedroom, went down the hall, bathroom door closed and LOCKED
- She is in a different room with a closed door = NO LONGER PRESENT
- Remove her from the array - she's not in the scene anymore

Jake and Mike remain:
- Jake's activity and mood updated to reflect aftermath
- Mike's activity updated to questioning, mood shifted
- Both outfits unchanged

Key principle: When someone goes to another room AND closes the door (especially locks it), they've left the scene. The POV character cannot see or directly interact with them.
</explanation>
</example>

<example type="pov_moves_leaving_character_behind">
<input>
*The tension in the living room was unbearable. Rachel's roommate Dave had been hovering the entire time, making comments, and I'd finally had enough.*

*I stood up and held out my hand to Rachel.*

"Can we talk? Alone?"

*Rachel glanced at Dave, then back at me. She took my hand and let me pull her up from the couch.*

Rachel: "Yeah. Let's go to my room."

*We walked down the hallway together. I could feel Dave's eyes on our backs. Rachel opened her bedroom door and we stepped inside. She closed it firmly behind us, and I heard her flip the lock.*

*The bedroom was small but cozy - fairy lights strung above the bed, a pile of pillows, her guitar leaning against the wall.*

Rachel: *leaning back against the door, finally relaxing* "God, I'm sorry about him. He means well, he's just..."

"Overprotective?"

Rachel: *laughing softly* "That's one word for it."
</input>
<previous_state>
[{
  "name": "User",
  "position": "On the couch",
  "activity": "Trying to have a conversation with Rachel",
  "mood": ["frustrated", "tense", "hopeful"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Black button-up shirt",
    "legs": "Dark jeans",
    "underwear": "Boxer briefs",
    "socks": "Black socks",
    "footwear": null
  }
},
{
  "name": "Rachel",
  "position": "On the couch next to User",
  "activity": "Talking with User",
  "mood": ["nervous", "apologetic", "interested"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Cropped sweater",
    "legs": "High-waisted jeans",
    "underwear": "Bra and panties",
    "socks": "Ankle socks",
    "footwear": null
  }
},
{
  "name": "Dave",
  "position": "Armchair across from couch",
  "activity": "Watching User and Rachel, making comments",
  "mood": ["suspicious", "protective", "intrusive"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Gaming t-shirt",
    "legs": "Sweatpants",
    "underwear": "Boxers",
    "socks": null,
    "footwear": "Slippers"
  }
}]
</previous_state>
<output>
[{
  "name": "User",
  "position": "Standing in Rachel's bedroom",
  "activity": "Talking privately with Rachel",
  "mood": ["relieved", "curious", "warm"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Black button-up shirt",
    "legs": "Dark jeans",
    "underwear": "Boxer briefs",
    "socks": "Black socks",
    "footwear": null
  }
},
{
  "name": "Rachel",
  "position": "Leaning against bedroom door",
  "activity": "Apologizing for Dave, relaxing now that they're alone",
  "mood": ["relieved", "amused", "comfortable"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Cropped sweater",
    "legs": "High-waisted jeans",
    "underwear": "Bra and panties",
    "socks": "Ankle socks",
    "footwear": null
  }
}]
</output>
<explanation>
POV CHARACTER MOVES WITH ANOTHER, LEAVING SOMEONE BEHIND (3 → 2 characters):
- User and Rachel BOTH moved from living room to Rachel's bedroom
- Door was closed AND locked behind them
- Dave was left in the living room - he's no longer present in the current scene
- REMOVE Dave from the array - the scene is now in the bedroom, not the living room

User and Rachel remain (they moved together):
- Both have updated positions reflecting the new room
- Both have updated moods - relief at being alone
- Outfits unchanged

Key principle: The scene follows the POV character. When POV moves to a new room with someone and shuts the door, anyone left behind is removed from the array.
</explanation>
</example>

<example type="character_entering">
<input>
*Elena was curled up on the couch reading when she heard keys in the front door. She set her book down, marking her place with a finger.*

*Marcus stepped inside, stomping snow off his boots on the mat. His cheeks were red from the cold, and he was juggling grocery bags in both arms.*

Marcus: "Little help?" *He nodded toward the kitchen, struggling not to drop anything.*

Elena: *jumping up* "I didn't know you were going shopping!"

*She hurried over to grab two of the bags, peeking inside.*

Elena: "Did you get the—"

Marcus: "Yes, I got your weird fancy cheese. And before you ask, yes, they had the good bread."
</input>
<previous_state>
[{
  "name": "Elena",
  "position": "Curled up on the couch",
  "activity": "Reading",
  "mood": ["relaxed", "content"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Oversized hoodie",
    "legs": "Yoga pants",
    "underwear": "Sports bra and cotton panties",
    "socks": "Thick wool socks",
    "footwear": null
  }
}]
</previous_state>
<output>
[{
  "name": "Elena",
  "position": "Near the front door",
  "activity": "Helping Marcus with groceries",
  "mood": ["pleasantly surprised", "helpful", "cheerful"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Oversized hoodie",
    "legs": "Yoga pants",
    "underwear": "Sports bra and cotton panties",
    "socks": "Thick wool socks",
    "footwear": null
  }
},
{
  "name": "Marcus",
  "position": "Just inside front door",
  "activity": "Arriving home with groceries",
  "mood": ["cold but pleased", "playful"],
  "physicalState": ["cheeks red from cold"],
  "outfit": {
    "head": null,
    "neck": "Scarf",
    "jacket": "Winter coat",
    "back": null,
    "torso": null,
    "legs": "Jeans",
    "underwear": null,
    "socks": null,
    "footwear": "Snow boots"
  }
}]
</output>
<explanation>
CHARACTER ENTERING SCENE:
- Marcus was NOT in previous state - he just arrived home
- ADD him to the array with full state information
- Infer reasonable outfit for context (winter, just came from outside)
- Note visible physical states (red cheeks from cold)

Elena updated:
- Position moved from couch to near front door
- Activity and mood updated
- Outfit unchanged

Key principle: When a character enters (arrives, comes through door, appears), ADD them to the array. Infer what you can about their state from context.
</explanation>
</example>

<example type="character_entering_room">
<input>
*Jake had been working at his desk for hours when the study door creaked open. He glanced up to see Sarah peeking in, two mugs in her hands.*

Sarah: "Peace offering?" *She held up the mugs.* "I made hot chocolate. The good kind, with the little marshmallows."

*Jake leaned back in his chair, rubbing his tired eyes.*

Jake: "I thought you were asleep."

Sarah: *padding over in her slippers* "Couldn't sleep. And I felt bad about earlier." *She set one mug on his desk, wrapping both hands around her own.* "Can we talk? Actually talk this time?"

*She perched on the arm of the leather chair in the corner, tucking her feet up under her robe.*
</input>
<previous_state>
[{
  "name": "Jake",
  "position": "At desk in study",
  "activity": "Working on laptop",
  "mood": ["focused", "tired", "distracted"],
  "physicalState": ["eye strain"],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "White undershirt",
    "legs": "Pajama pants",
    "underwear": "Boxers",
    "socks": null,
    "footwear": null
  }
}]
</previous_state>
<output>
[{
  "name": "Jake",
  "position": "Leaning back in desk chair",
  "activity": "Talking with Sarah",
  "mood": ["tired", "cautious", "receptive"],
  "physicalState": ["eye strain", "tired eyes"],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "White undershirt",
    "legs": "Pajama pants",
    "underwear": "Boxers",
    "socks": null,
    "footwear": null
  }
},
{
  "name": "Sarah",
  "position": "Perched on arm of leather chair",
  "activity": "Offering peace, wanting to talk",
  "mood": ["apologetic", "hopeful", "nervous"],
  "physicalState": [],
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": "Fluffy robe",
    "back": null,
    "torso": null,
    "legs": null,
    "underwear": null,
    "socks": null,
    "footwear": "Slippers"
  }
}]
</output>
<explanation>
CHARACTER ENTERING FROM ANOTHER ROOM:
- Sarah was NOT present before (she was in bed/elsewhere in house)
- She opened the door and came into the study = now present
- ADD her to the array
- Outfit inferred from context (robe, slippers = nightwear, came from bedroom)

Jake updated:
- Position detail added (leaning back)
- Mood shifted to reflect the interruption and conversation
- Added "tired eyes" to physical state (rubbing eyes)

Key principle: When someone enters from another room (opens door, comes in), add them. They are now present and interactable.
</explanation>
</example>

<bad_example type="missing_entering_character">
<input>
*The front door burst open and both Marcus and his sister Emma tumbled in, laughing and shaking snow off their coats.*

Marcus: "Elena! You're not going to believe what happened at the store!"

Emma: *still giggling* "Tell her about the shopping cart!"

*Elena looked up from her book, eyebrows raised at the commotion.*
</input>
<previous_state>
[{
  "name": "Elena",
  "position": "On the couch",
  "activity": "Reading",
  "mood": ["relaxed"],
  "physicalState": [],
  "outfit": { "torso": "Sweater", "legs": "Leggings" }
}]
</previous_state>
<wrong_output>
[{
  "name": "Elena",
  "position": "On the couch",
  "activity": "Looking up at Marcus",
  "mood": ["curious", "amused"],
  "physicalState": [],
  "outfit": { "torso": "Sweater", "legs": "Leggings" }
},
{
  "name": "Marcus",
  "position": "Just inside front door",
  "activity": "Telling a story",
  "mood": ["excited", "amused"],
  "physicalState": ["snow in hair"],
  "outfit": { "jacket": "Winter coat", "legs": "Jeans", "footwear": "Boots" }
}]
</wrong_output>
<why_bad>
MISSING CHARACTER - Emma entered too but is not in the output!
- Both Marcus AND Emma came through the door together
- Emma is speaking, laughing, interacting - she is clearly present
- The output only includes Marcus, forgetting Emma entirely
- CORRECT output should include all 3 characters: Elena, Marcus, AND Emma
</why_bad>
</bad_example>

<bad_example type="character_not_removed">
<input>
*The argument reached its peak. Sarah grabbed her keys from the counter.*

Sarah: "I can't be here right now. I'm going for a drive."

*She didn't wait for Jake's response, just walked out the front door. Through the window, Jake watched her car back out of the driveway and disappear down the street.*

*Mike, who had been frozen in the kitchen doorway the whole time, finally exhaled.*

Mike: "Dude... that was intense."
</input>
<previous_state>
[{
  "name": "Jake",
  "position": "In the living room",
  "activity": "Arguing with Sarah",
  "mood": ["angry", "defensive"],
  "physicalState": [],
  "outfit": { "torso": "T-shirt", "legs": "Jeans" }
},
{
  "name": "Sarah",
  "position": "In the living room",
  "activity": "Arguing with Jake",
  "mood": ["furious", "hurt"],
  "physicalState": [],
  "outfit": { "torso": "Blouse", "legs": "Skirt" }
},
{
  "name": "Mike",
  "position": "Kitchen doorway",
  "activity": "Awkwardly witnessing",
  "mood": ["uncomfortable"],
  "physicalState": [],
  "outfit": { "torso": "Hoodie", "legs": "Shorts" }
}]
</previous_state>
<wrong_output>
[{
  "name": "Jake",
  "position": "In the living room",
  "activity": "Watching Sarah leave",
  "mood": ["stunned", "regretful"],
  "physicalState": [],
  "outfit": { "torso": "T-shirt", "legs": "Jeans" }
},
{
  "name": "Sarah",
  "position": "Left the house",
  "activity": "Driving away",
  "mood": ["upset"],
  "physicalState": [],
  "outfit": { "torso": "Blouse", "legs": "Skirt" }
},
{
  "name": "Mike",
  "position": "Kitchen doorway",
  "activity": "Commenting on the situation",
  "mood": ["relieved", "concerned"],
  "physicalState": [],
  "outfit": { "torso": "Hoodie", "legs": "Shorts" }
}]
</wrong_output>
<why_bad>
CHARACTER NOT REMOVED - Sarah left but is still in the output!
- Sarah walked out the front door, got in her car, and drove away
- She is GONE from the scene - not in the house anymore
- The output incorrectly keeps her with "position: Left the house"
- NEVER use position to indicate someone left - REMOVE them from the array entirely
- CORRECT output should only include Jake and Mike (2 characters, not 3)
</why_bad>
</bad_example>

<bad_example type="outfit_descriptors">
<output>
[{
  "name": "Elena",
  "outfit": {
    "head": null,
    "neck": null,
    "jacket": null,
    "back": null,
    "torso": "Sports bra (removed from shoulder)",
    "legs": null,
    "underwear": null,
    "socks": "Dance socks (removed)",
    "footwear": "Sneakers (off)"
  }
}]
</output>
<why_bad>
- "(removed)" and "(off)" should NOT be used - set to null instead for fully removed items
- "Sports bra (removed from shoulder)" is wrong - she just pulled the strap, the bra is still on. Should be "Black sports bra (damp)" since it's still being worn
- Socks and footwear should be null, not have removal descriptors
- Use state descriptors only for items still being worn: "(unbuttoned)", "(damp)", "(pulled aside)" - never "(removed)" or "(off)"
</why_bad>
</bad_example>
</examples>

<current_location>
{{location}}
</current_location>

<previous_characters>
{{previousState}}
</previous_characters>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract updated characters as valid JSON array:`,
	},

	scene_initial: {
		key: 'scene_initial',
		name: 'Scene - Initial',
		description: 'Extracts scene topic, tone, tension, and events from opening',
		defaultTemperature: 0.6,
		placeholders: [
			COMMON_PLACEHOLDERS.characterInfo,
			COMMON_PLACEHOLDERS.charactersSummary,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze this roleplay scene and extract the scene state. You must only return valid JSON with no commentary.

<instructions>
<general>
- Determine the topic, tone, tension, and significant events of the scene.
- Topic should be 3-5 words summarizing the main focus.
- Tone should be 2-3 descriptive words capturing the emotional atmosphere (e.g. "Tense, suspicious" or "Warm, playful").
</general>
<tension>
- Direction will be calculated automatically, but set your best guess.
<levels>
Tension levels form a spectrum of emotional/dramatic intensity (applies to ALL tension types):
- relaxed: Low stakes, comfortable. Casual chat, downtime, nothing pressing.
- aware: Mild interest or attention. Something noted but no real stakes yet.
- guarded: Careful, measured. Testing waters - whether for trust, attraction, or safety.
- tense: Stakes feel real. Could be conflict brewing, unspoken attraction, or difficult truth approaching.
- charged: Intense emotions dominate. Anger before a fight, desire before a kiss, fear before confession.
- volatile: On the edge. One word changes everything - into violence, intimacy, or revelation.
- explosive: The moment itself. Fight breaks out, characters kiss or engage in sex, secret revealed, breakdown happens.
</levels>
<types>
Tension type describes the nature of what's driving the tension:
- conversation: Neutral dialogue, information exchange, casual interaction.
- negotiation: Competing interests seeking agreement. Deals, persuasion, bargaining.
- confrontation: Direct opposition or conflict. Arguments, accusations, standoffs.
- intimate: Emotional/physical closeness. Romance, deep sharing, intimacy, sexual tension.
- vulnerable: Exposure of weakness or secrets. Confessions, emotional risk, asking for help.
- suspense: Uncertainty about outcome. Waiting, anticipation, something about to happen.
- celebratory: Positive excitement. Joy, triumph, celebration, shared happiness.
</types>
</tension>
<recent_events>
- Include significant events that affect the ongoing narrative.
- Events should be consequential: discoveries, relationship changes, injuries, commitments.
- Maximum 5 events, prioritize the most important ones.
</recent_events>
</instructions>

<examples>
<example>
<input>
*The restaurant had finally emptied out, the last of the dinner crowd filtering into the rainy night outside. Elena sat across from Marcus in the corner booth, her wine glass mostly untouched, watching him struggle to find the right words. He'd asked her to dinner with that particular tone in his voice—the one that meant something important was coming—and she'd spent the entire meal waiting for the other shoe to drop.*

*The candles on the table had burned down to stubs, casting flickering shadows across his face. Outside, thunder rumbled in the distance, and the rain intensified against the windows. A waiter hovered near the kitchen door, clearly wanting to close up but too polite to interrupt.*

Elena: "Marcus, whatever it is, just say it. You've been dancing around something all night."

Marcus: *finally meeting her eyes* "I'm leaving. The job in Tokyo—I took it." *He reached across the table, his fingers brushing against hers.* "But I don't want to go without you."

*The words hung in the air between them. Elena felt her heart skip, her mind racing through a thousand implications—her career, her family, everything she'd built here. But looking at him now, vulnerable and hopeful and terrified all at once, she realized the answer wasn't as complicated as she'd thought.*
</input>
<output>
{
  "topic": "Life-changing proposal",
  "tone": "Vulnerable, electric, bittersweet",
  "tension": {"level": "charged", "type": "intimate", "direction": "escalating"}
}
</output>
<explanation>
TOPIC: "Life-changing proposal" - captures the weight of what's being asked (not just "dinner conversation" or "relationship talk"). The proposal isn't marriage, but it IS asking her to change her entire life.

TONE: Three words to capture a complex emotional atmosphere:
- "Vulnerable" - Marcus is exposing himself to rejection, Elena is confronting a huge decision
- "Electric" - the air is charged with anticipation and significance
- "Bittersweet" - whatever the answer, something will be lost (either the opportunity or her current life)

TENSION analysis:
- Level "charged": Intense emotions dominate. This is a pivotal moment—not yet at "volatile" (one word changes everything) but definitely beyond "tense" (stakes feel real)
- Type "intimate": This is about emotional/relational closeness, not conflict. Despite the stakes, they're on the same side
- Direction "escalating": Building toward a decision/revelation. The question has been asked; the answer will raise or resolve tension further

Why NOT other levels:
- Not "explosive" - the moment hasn't broken yet, she hasn't answered
- Not "volatile" - there's no sense it could go violent or completely wrong
- Not "tense" - too understated for this pivotal moment
</explanation>
</example>

<example>
<input>
*The precinct bullpen was chaos—phones ringing, detectives shouting across desks, a suspect being dragged toward booking while screaming about his rights. But Captain Rodriguez's office was an island of deadly calm. Sarah sat in the hard plastic chair across from his desk, hands folded in her lap, expression carefully neutral.*

*Rodriguez hadn't said a word since calling her in. He just sat there, reading through the file in front of him, occasionally making small noises of disapproval. The silence stretched unbearably. On the wall behind him, the clock ticked loud enough to hear—2:47 PM. She'd been sitting here for almost five minutes.*

Rodriguez: *finally looking up* "Detective Chen. Thirteen years on the force. Exemplary record." *He closed the file with a soft thump.* "So explain to me why I have Internal Affairs breathing down my neck about a missing evidence log."

Sarah: "Captain, I filed that log myself three days ago. Whatever discrepancy they found—"

Rodriguez: *holding up a hand* "I've known you a long time, Chen. Which is why I'm giving you exactly one chance to tell me what really happened before this goes any further. Because right now?" *He leaned forward, his voice dropping.* "Right now, it looks like you made something disappear. And I need to know why."

*The accusation landed like a punch. Sarah felt the blood drain from her face, her carefully maintained composure cracking at the edges.*
</input>
<output>
{
  "topic": "Internal affairs accusation",
  "tone": "Ominous, suffocating, accusatory",
  "tension": {"level": "tense", "type": "confrontation", "direction": "escalating"}
}
</output>
<explanation>
TOPIC: "Internal affairs accusation" - specific and consequential. Not just "meeting with captain" or "work trouble." The IA involvement and evidence tampering allegation are the core issue.

TONE: Captures the oppressive atmosphere:
- "Ominous" - the extended silence, the careful reading, the ticking clock all create dread
- "Suffocating" - she's trapped, the room feels small despite the chaos outside, nowhere to go
- "Accusatory" - Rodriguez isn't asking if something happened; he's telling her he knows and demanding explanation

TENSION analysis:
- Level "tense": Stakes feel real—career, reputation, possibly freedom are on the line. The confrontation is direct but still in the "explain yourself" phase
- Type "confrontation": Direct opposition between authority figure and accused. Rodriguez has power; Sarah is defending herself
- Direction "escalating": Building toward a breaking point. Rodriguez is offering "one chance" which implies escalation is coming if she doesn't satisfy him

Why "tense" and not higher:
- Not "charged": That would suggest emotional intensity dominating—this is more controlled, procedural despite the stakes
- Not "volatile": Nobody's about to snap; this is deliberate pressure, not explosive emotion
- Could become "volatile" or "charged" if she confesses or accuses back, but currently it's a calculated confrontation
</explanation>
</example>

<example>
<input>
*The morning sun streamed through the kitchen windows as Elena padded in wearing Marcus's oversized t-shirt, her hair a mess from sleep. Marcus was already at the stove, the smell of bacon and coffee filling the apartment. He looked over his shoulder and grinned at her sleep-rumpled appearance.*

Marcus: "There she is. I was about to send a search party."

Elena: *yawning hugely* "What time is it?"

Marcus: "Almost eleven. You were out cold." *He slid a mug of coffee across the counter toward her.* "I figured you earned it after last night."

*She wrapped her hands around the warm mug, smiling into the steam. Through the window, she could see the city skyline glittering in the sunshine, the storm from last night nothing but a memory. Her phone buzzed on the counter—probably her sister checking in—but she ignored it. The real world could wait.*

Elena: "Is that bacon I smell?"

Marcus: "And pancakes. The good ones, with the chocolate chips." *He turned back to the stove, but not before she caught the soft expression on his face.* "Sit down, I'll bring you a plate."

*She hopped onto one of the bar stools, tucking her bare feet under her, and watched him cook with a contentment she hadn't felt in years.*
</input>
<output>
{
  "topic": "Lazy morning after",
  "tone": "Warm, domestic, contented",
  "tension": {"level": "relaxed", "type": "intimate", "direction": "stable"}
}
</output>
<explanation>
TOPIC: "Lazy morning after" - captures the context (implied intimacy the night before) and current activity (casual, unhurried morning). Specific enough to be useful, not overly clinical.

TONE: All positive, soft emotions:
- "Warm" - physical (sun, coffee, cooking) and emotional (their dynamic)
- "Domestic" - the comfortable ordinariness of the scene, making breakfast together
- "Contented" - no urgency, no worry, just enjoying the moment

TENSION analysis:
- Level "relaxed": Low stakes, comfortable. Nothing pressing, nobody worried, just enjoying each other
- Type "intimate": Despite the low tension, the TYPE is intimate—they're emotionally/physically close (she's wearing his shirt, he's making her favorite breakfast)
- Direction "stable": No building or releasing of tension. The scene could continue like this indefinitely

Key insight: Low tension doesn't mean the scene isn't meaningful or intimate. "Relaxed" + "intimate" captures a loving, comfortable relationship moment. Not every scene needs conflict.

Why NOT other types:
- Not "conversation" - that implies neutral exchange, but there's clear romantic intimacy here
- Not "celebratory" - they're not celebrating anything specific, just enjoying normalcy
</explanation>
</example>

<bad_example>
<output>
{
  "topic": "Dinner",
  "tone": "Romantic",
  "tension": {"level": "moderate", "type": "emotional", "direction": "building"}
}
</output>
<why_bad>
- topic too vague: "Dinner" could be anything. Should capture what makes THIS dinner significant: "Life-changing proposal"
- tone too simple: "Romantic" is one word and doesn't capture the complexity. Use 2-3 descriptive words: "Vulnerable, electric, bittersweet"
- tension level invalid: "moderate" is not a valid level. Must use: relaxed, aware, guarded, tense, charged, volatile, explosive
- tension type invalid: "emotional" is not a valid type. Must use: conversation, negotiation, confrontation, intimate, vulnerable, suspense, celebratory
- direction invalid: "building" is not valid. Must use: escalating, stable, decreasing
</why_bad>
</bad_example>
</examples>

<character_info>
{{userInfo}}

{{characterInfo}}
</character_info>

<characters_present>
{{charactersSummary}}
</characters_present>

<scene_messages>
{{messages}}
</scene_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the scene state as valid JSON:`,
	},

	scene_update: {
		key: 'scene_update',
		name: 'Scene - Update',
		description: 'Updates scene state based on recent messages',
		defaultTemperature: 0.6,
		placeholders: [
			COMMON_PLACEHOLDERS.charactersSummary,
			COMMON_PLACEHOLDERS.previousState,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze these roleplay messages and update the scene state. You must only return valid JSON with no commentary.

<instructions>
<general>
- Update topic if the focus has shifted.
- Update tone if the emotional atmosphere has changed. Use 2-3 descriptive words (e.g. "Tense, suspicious" or "Warm, playful").
- Consider whether tension has increased, decreased, or remained stable.
</general>
<tension>
- Direction will be recalculated based on level change.
- If previous direction was 'stable', strongly consider whether type or level has changed.
<levels>
Tension levels form a spectrum of emotional/dramatic intensity (applies to ALL tension types):
- relaxed: Low stakes, comfortable. Casual chat, downtime, nothing pressing.
- aware: Mild interest or attention. Something noted but no real stakes yet.
- guarded: Careful, measured. Testing waters - whether for trust, attraction, or safety.
- tense: Stakes feel real. Could be conflict brewing, unspoken attraction, or difficult truth approaching.
- charged: Intense emotions dominate. Anger before a fight, desire before a kiss, fear before confession.
- volatile: On the edge. One word changes everything - into violence, intimacy, or revelation.
- explosive: The moment itself. Fight breaks out, characters kiss or engage in sex, secret revealed, breakdown happens.
</levels>
<types>
Tension type describes the nature of what's driving the tension:
- conversation: Neutral dialogue, information exchange, casual interaction.
- negotiation: Competing interests seeking agreement. Deals, persuasion, bargaining.
- confrontation: Direct opposition or conflict. Arguments, accusations, standoffs.
- intimate: Emotional/physical closeness. Romance, deep sharing, intimacy, sexual tension.
- vulnerable: Exposure of weakness or secrets. Confessions, emotional risk, asking for help.
- suspense: Uncertainty about outcome. Waiting, anticipation, something about to happen.
- celebratory: Positive excitement. Joy, triumph, celebration, shared happiness.
</types>
</tension>
<recent_events>
- Keep events that are still relevant to the ongoing scene.
- Remove events that have been resolved or superseded.
- Add new significant events from the recent messages.
- Maximum 5 events - prune aggressively, keep most salient.
- Even if previous_scene has more than 5 events, return at most 5.
</recent_events>
</instructions>

<examples>
<example>
<input>
*Elena set down her wine glass with deliberate care, her laughter from a moment ago fading as something shifted in her expression. Across the table, Marcus was still chuckling about the ridiculous mishap she'd just described—the time she'd accidentally called her boss "mom" in a board meeting—but Elena wasn't smiling anymore.*

Elena: "Marcus, there's something I need to tell you." *She clasped her hands together on the table, knuckles whitening.* "About that night. The night you found me at the hotel."

*The temperature in the room seemed to drop. Marcus's smile faltered, then disappeared entirely. He'd asked about that night a dozen times over the past six months, and she'd always deflected, always found a way to change the subject. The fact that she was bringing it up now...*

Marcus: "Elena, you don't have to—"

Elena: "Yes, I do." *She finally looked up at him, and he could see the fear there, the vulnerability she usually kept so carefully hidden.* "I wasn't there for a work conference. I was meeting someone. Someone I'd been talking to for months." *Her voice cracked.* "Someone I almost left you for."

*The words hung between them like broken glass.*
</input>
<previous_scene>
{
  "topic": "Sharing embarrassing memories",
  "tone": "Lighthearted, nostalgic, warm",
  "tension": {"level": "relaxed", "type": "conversation", "direction": "stable"}
}
</previous_scene>
<output>
{
  "topic": "Confession of almost-affair",
  "tone": "Heavy, fearful, exposed",
  "tension": {"level": "volatile", "type": "vulnerable", "direction": "escalating"}
}
</output>
<explanation>
DRAMATIC SHIFT in scene state:

TOPIC: "Sharing embarrassing memories" → "Confession of almost-affair"
- The subject matter has completely transformed from light anecdotes to a relationship-threatening revelation
- Topic should reflect what the scene is NOW about, not what it started as

TONE: "Lighthearted, nostalgic, warm" → "Heavy, fearful, exposed"
- Complete tonal reversal - none of the original warmth remains
- "Heavy" - the weight of the confession, the "broken glass" metaphor
- "Fearful" - Elena's visible fear, her vulnerability
- "Exposed" - she's revealing her deepest secret, making herself vulnerable

TENSION changes:
- Level: "relaxed" → "volatile" (jumped multiple levels)
  * This isn't just "tense" - she's confessing to almost ending the relationship
  * "Volatile" = one word changes everything, and her next words could destroy or save them
- Type: "conversation" → "vulnerable"
  * This is about exposure of secrets, emotional risk, not casual exchange
  * She's asking for forgiveness by confessing, putting herself at his mercy
- Direction: "stable" → "escalating"
  * The revelation demands a response; tension is building toward Marcus's reaction

Why "volatile" not "explosive":
- "Explosive" is the moment itself - the fight breaking out, the breakdown happening
- We're AT the edge of explosive, but Marcus hasn't reacted yet
- His response could push it to "explosive" or start de-escalating
</explanation>
</example>

<example>
<input>
*The shouting had finally stopped. Marcus stood by the window, his back to the room, shoulders tight with tension. Elena sat on the edge of the bed where she'd collapsed after their worst fight yet, mascara-streaked tears still drying on her cheeks. Neither of them had spoken in almost five minutes.*

*Finally, Marcus turned around. His expression was unreadable, but when he spoke, his voice was quieter than she'd ever heard it.*

Marcus: "I need to know one thing." *He crossed the room slowly, stopping a few feet from the bed.* "Did you love him?"

Elena: *voice barely a whisper* "No." *She looked up at him, and for the first time tonight, she let him see everything—the regret, the shame, the desperate hope.* "I was lonely, and I was stupid, and I was looking for something I already had. But I never loved him." *She reached out tentatively.* "I love you. I've only ever loved you."

*Marcus stared at her outstretched hand for a long moment. Then, slowly, he took it.*

Marcus: "Then we figure this out." *He sat down beside her, still holding her hand.* "I don't know how yet, but... we figure it out."
</input>
<previous_scene>
{
  "topic": "Confession of almost-affair",
  "tone": "Heavy, fearful, exposed",
  "tension": {"level": "volatile", "type": "vulnerable", "direction": "escalating"}
}
</previous_scene>
<output>
{
  "topic": "Choosing forgiveness",
  "tone": "Raw, fragile, hopeful",
  "tension": {"level": "charged", "type": "vulnerable", "direction": "decreasing"}
}
</output>
<explanation>
RESOLUTION beginning - tension decreasing but still intense:

TOPIC: "Confession of almost-affair" → "Choosing forgiveness"
- The confession has been made; now the scene is about his response
- "Choosing forgiveness" captures that this is an active decision, not passive acceptance

TONE: "Heavy, fearful, exposed" → "Raw, fragile, hopeful"
- Still emotionally intense, but the quality has shifted
- "Raw" - nerves exposed, both vulnerable, the aftermath of emotional upheaval
- "Fragile" - this reconciliation could still shatter; they're being careful
- "Hopeful" - he took her hand, they're going to try

TENSION changes:
- Level: "volatile" → "charged"
  * Still intense emotions, but the immediate danger has passed
  * "Volatile" (one word changes everything) → "charged" (emotions dominate, but there's direction)
  * He's chosen to stay; that decision lowered the stakes
- Type: Still "vulnerable"
  * This remains about emotional exposure and risk
  * She's still exposed; he's now exposed too by choosing forgiveness
- Direction: "escalating" → "decreasing"
  * The worst moment has passed
  * They're moving toward resolution, not away from it
  * Tension is releasing, though slowly

Why not lower than "charged":
- This isn't "tense" (still too raw for that measured feeling)
- Definitely not "guarded" or "relaxed" - they just had their worst fight ever
- The emotions are still overwhelming; they're just now moving in a positive direction
</explanation>
</example>

<example>
<input>
*The apartment was chaos—balloons everywhere, streamers hanging from every surface, the kitchen counter covered in half-assembled party supplies. Elena stood in the middle of it all, hair in a messy bun, wearing an apron covered in frosting stains, looking utterly frazzled.*

Elena: "The cake is lopsided, Marcus. LOPSIDED." *She gestured at the three-tier monstrosity on the counter.* "Sophie's going to be here in two hours and I haven't even started the frosting and the living room still needs—"

Marcus: *catching her by the shoulders* "Hey. Breathe."

Elena: *taking a shaky breath* "I just want it to be perfect. She only turns five once, and after the year she's had with the hospital and everything—"

Marcus: "And she's going to love it." *He pulled her into a hug, despite the flour on her apron.* "She's going to love the lopsided cake and the slightly crooked streamers and the balloons that I definitely did not accidentally pop three of while inflating."

Elena: *laughing despite herself* "Three?!"

Marcus: "They were VERY aggressive balloons." *He kissed her forehead.* "Now put me to work. What needs frosting?"

*Elena finally let some of the tension drain from her shoulders. It wasn't going to be perfect. But watching Marcus gamely attempt to wield a piping bag, she realized it was going to be exactly right.*
</input>
<previous_scene>
{
  "topic": "Birthday party crisis",
  "tone": "Frantic, stressed, anxious",
  "tension": {"level": "tense", "type": "suspense", "direction": "escalating"}
}
</previous_scene>
<output>
{
  "topic": "Party preparation teamwork",
  "tone": "Reassured, warm, playful",
  "tension": {"level": "aware", "type": "conversation", "direction": "decreasing"}
}
</output>
<explanation>
STRESS → REASSURANCE transition:

TOPIC: "Birthday party crisis" → "Party preparation teamwork"
- The "crisis" has been reframed as manageable
- Focus shifted from "everything is going wrong" to "we're doing this together"
- Still party prep, but the framing is completely different

TONE: "Frantic, stressed, anxious" → "Reassured, warm, playful"
- Complete reversal through Marcus's intervention
- "Reassured" - he calmed her down, validated her stress, offered help
- "Warm" - the hug, the kiss, the physical comfort
- "Playful" - the balloon joke, her laughing despite herself

TENSION changes:
- Level: "tense" → "aware"
  * "Tense" = stakes feel real (party pressure, Sophie's health history)
  * "Aware" = mild interest/attention, something noted but manageable
  * Marcus successfully lowered the emotional temperature
- Type: "suspense" → "conversation"
  * "Suspense" was about uncertainty (will the party be okay?)
  * Now it's just two people talking, working together
  * The outcome is no longer in question - it'll be fine
- Direction: "escalating" → "decreasing"
  * She was spiraling; now she's grounded
  * The stress is actively dissipating

This shows how quickly tension can shift through emotional support - one conversation completely changed the scene's energy.
</explanation>
</example>

<bad_example>
<output>
{
  "topic": "Sharing embarrassing memories",
  "tone": "Lighthearted, nostalgic, warm",
  "tension": {"level": "relaxed", "type": "conversation", "direction": "stable"}
}
</output>
<why_bad>
This is just copying the previous_scene without analyzing the new messages!
- The messages show a DRAMATIC confession about an almost-affair
- Topic should change: "Sharing embarrassing memories" → "Confession of almost-affair"
- Tone should change completely: "Lighthearted" → "Heavy, fearful, exposed"
- Tension should jump dramatically: "relaxed" → "volatile", "conversation" → "vulnerable"
- Direction should change: "stable" → "escalating"

Always analyze what ACTUALLY happened in the recent_messages and update accordingly. Never just return the previous state unchanged when significant events occurred.
</why_bad>
</bad_example>
</examples>

<characters_present>
{{charactersSummary}}
</characters_present>

<previous_scene>
{{previousState}}
</previous_scene>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the updated scene state as valid JSON:`,
	},

	event_extract: {
		key: 'event_extract',
		name: 'Event - Extract',
		description:
			'Extracts significant events from recent messages with relationship signals',
		defaultTemperature: 0.4,
		placeholders: [
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.currentRelationships,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze these roleplay messages and extract any significant events that occurred. You must only return valid JSON with no commentary.

<instructions>
<general>
- Identify significant events that affect the narrative, relationships, or character development.
- A "significant event" is something consequential: a revelation, promise, conflict, intimate moment, discovery, or decision.
- If nothing significant happened (just casual dialogue or routine actions), return a summary indicating no notable event.
- Focus on what actually happened, not background information or internal thoughts alone.
</general>

<summary_guidelines>
Write a DETAILED 2-sentence summary that captures:
- Specifically what happened (actions, words, reactions)
- Who was involved and their emotional state
- The context and significance of the moment

BAD (too vague): "They kissed."
GOOD: "After weeks of tension, Elena finally pulled Marcus close and kissed him softly, her hands trembling against his chest. He responded by wrapping his arms around her waist and deepening the kiss, neither of them caring that they were standing in the middle of the crowded marketplace."

BAD: "They had an argument."
GOOD: "Marcus's accusation about the missing money sent Elena into a defensive rage, her voice rising as she threw the ledger across the table at him. The confrontation ended with her storming out into the rain, leaving Marcus alone with the shattered remnants of their partnership."
</summary_guidelines>

<event_types>
Select ALL applicable event types (multiple can apply to one event):

CONVERSATION & SOCIAL:
- conversation: General dialogue, discussion, chatting
- confession: Admitting feelings, confessing something, revealing truth
- argument: Verbal conflict, heated disagreement
- negotiation: Making deals, bargaining, compromising

DISCOVERY & SECRETS:
- discovery: Learning new information, revelation
- secret_shared: Voluntarily sharing a secret with someone
- secret_revealed: A secret being exposed (possibly unwillingly)

EMOTIONAL:
- emotional: Emotional vulnerability, showing feelings
- supportive: Providing comfort, emotional support
- rejection: Rejecting someone's advances or request
- comfort: Comforting someone who is distressed
- apology: Apologizing for something done wrong
- forgiveness: Forgiving someone for a transgression

BONDING & CONNECTION:
- laugh: Sharing a genuine laugh, humor, joy together
- gift: Giving or receiving a gift (offered to buy drinks/food, gave a present, brought flowers)
- compliment: Giving sincere praise or compliment (complimented appearance, praised skills, admired qualities)
- tease: Playful teasing, banter, jokes at someone's expense (not mean-spirited)
- flirt: Flirtatious behavior, romantic advances (suggestive comments, winks, innuendo)
- date: Going on a date or romantic outing
- i_love_you: Saying "I love you" or equivalent declaration of love
- sleepover: Sleeping over together (non-sexual, just sharing a bed/space)
- shared_meal: Eating together (breakfast, lunch, dinner, coffee, drinks, snacks together)
- shared_activity: Doing an activity together (games, hobbies, adventures, watching movies)

ROMANTIC INTIMACY:
- intimate_touch: Hand-holding, caressing, non-sexual physical affection
- intimate_kiss: Kissing (any type)
- intimate_embrace: Hugging, cuddling, holding each other
- intimate_heated: Making out, heavy petting, grinding

SEXUAL ACTIVITY (select all that apply):
- intimate_foreplay: Teasing, undressing, building up to sex
- intimate_oral: Oral sexual activity
- intimate_manual: Manual stimulation (hands, fingers)
- intimate_penetrative: Penetrative sex
- intimate_climax: Orgasm, completion

ACTION & DANGER:
- action: Physical activity, doing something concrete
- combat: Fighting, violence, physical conflict
- danger: Threat, peril, risky situation

COMMITMENTS:
- decision: Making a significant choice
- promise: Making a commitment or vow
- betrayal: Breaking trust, backstabbing
- lied: Telling a lie or deceiving someone (NOT for sharing true secrets)

LIFE EVENTS:
- exclusivity: Committing to an exclusive relationship
- marriage: Getting married, wedding ceremony
- pregnancy: Discovering or announcing pregnancy
- childbirth: Having a baby, giving birth

SOCIAL:
- social: Meeting new people, group dynamics
- achievement: Accomplishing a goal, success

SUPPORT & PROTECTION:
- helped: Helped with something significant (assisted with a task, solved a problem for them)
- common_interest: Discovered a shared interest or hobby (realized they both love the same thing)
- outing: Went somewhere together casually (not a romantic date, just hanging out)
- defended: Defended or stood up for them (protected them verbally or physically)
- crisis_together: Went through danger or hardship together (survived a threat, faced adversity)
- vulnerability: Showed weakness or vulnerability (admitted fear, showed insecurity, let guard down)
- entrusted: Entrusted with something important (asked to watch over something precious, given responsibility)

EXAMPLES of multi-select:
- A kiss during a love confession = ["confession", "intimate_kiss", "emotional"]
- Revealing a secret while being held = ["secret_shared", "intimate_embrace", "emotional"]
- An argument that turns into a fight = ["argument", "combat"]
- Sex scene = ["intimate_heated", "intimate_foreplay", "intimate_penetrative", "intimate_climax"] (select all that apply)

IMPORTANT: Intimacy types are for ACTUAL physical contact, not discussing intimacy.
- Talking about wanting to kiss someone = ["conversation"] or ["emotional"]
- Actually kissing someone = ["intimate_kiss"]
</event_types>

<event_details>
MANDATORY: You MUST provide an eventDetails entry for EVERY event type you select.
Each entry should be a brief phrase (5-15 words) describing what specifically happened.

Examples by type:
- conversation: "discussed plans for the heist tomorrow night"
- confession: "Elena admitted her romantic feelings for Marcus"
- argument: "fought about whether to trust the informant"
- discovery: "found the hidden compartment in the desk"
- secret_shared: "Elena revealed her TRUE past as a thief"
- secret_revealed: "Marcus's true identity as an agent was exposed"
- emotional: "Elena broke down crying about her father"
- supportive: "Marcus comforted Elena after her breakdown"
- comfort: "held her while she cried about her past"
- apology: "apologized for lying about his identity"
- forgiveness: "forgave Marcus for the betrayal"
- laugh: "shared a genuine laugh at his terrible joke"
- gift: "gave her a hand-carved wooden pendant"
- gift: "offered to buy her dinner at the café"
- gift: "brought her favorite coffee as a surprise"
- compliment: "told her she had the most beautiful smile"
- compliment: "praised his bravery in facing the danger"
- tease: "playfully mocked his cooking disaster"
- tease: "joked about his terrible sense of direction"
- flirt: "winked and suggested they find somewhere private"
- flirt: "leaned in close while complimenting her eyes"
- date: "went to the art museum together"
- i_love_you: "told her he loved her for the first time"
- sleepover: "fell asleep together on the couch"
- shared_meal: "had dinner together at the candlelit restaurant"
- shared_meal: "ate breakfast together at the café"
- shared_meal: "grabbed coffee and chatted for hours"
- shared_activity: "played cards together into the night"
- shared_activity: "watched the sunset together from the rooftop"
- intimate_kiss: "first kiss in the corner booth"
- intimate_embrace: "held each other on the couch"
- promise: "vowed to protect Elena no matter what"
- betrayal: "sold the information to their enemies"
- lied: "told Marcus she was a teacher when she's actually a spy"
- helped: "fixed her broken laptop and recovered the files"
- helped: "carried her bags all the way home"
- common_interest: "discovered they both love vintage cars"
- common_interest: "realized they share a passion for astronomy"
- outing: "walked through the park together on a lazy afternoon"
- outing: "explored the old bookshop district together"
- defended: "stood up for him when others mocked his idea"
- defended: "stepped between her and the aggressive stranger"
- crisis_together: "survived the storm trapped in the cabin"
- crisis_together: "escaped the collapsing building together"
- vulnerability: "admitted she was terrified of failing"
- vulnerability: "broke down and showed his insecurities"
- entrusted: "asked her to watch over his grandmother's ring"
- entrusted: "trusted him with the key to her apartment"

CRITICAL - SECRET_SHARED vs LIED:
- secret_shared: Character shares a TRUE secret about themselves (real past, real identity, real feelings)
- lied: Character tells something FALSE, deceives, or gives a cover story
- If someone shares a fake backstory, that is "lied" NOT "secret_shared"
- "secret_shared" is ONLY for truthful revelations

SECRET_SHARED vs SECRET_REVEALED:
- secret_shared: Character VOLUNTARILY tells someone their TRUE secret
- secret_revealed: TRUE secret is EXPOSED (found out, overheard, discovered by accident, or told by a third party)
</event_details>

<event_pairs>
MANDATORY: You MUST specify which two characters are involved in EACH event type.
Different event types can involve different character pairs!

FORMAT:
- Single pair: "combat": ["User", "Thug"]
- Multiple pairs (same event type): "combat": [["User", "Thug1"], ["User", "Thug2"]]

EXAMPLE 1 - Single pair (confession between two people):
eventTypes: ["confession", "emotional", "secret_shared"]
eventPairs: {
  "confession": ["Elena", "Marcus"],
  "emotional": ["Elena", "Marcus"],
  "secret_shared": ["Elena", "Marcus"]
}

EXAMPLE 2 - Combat with multiple enemies:
eventTypes: ["combat", "danger"]
eventPairs: {
  "combat": [["Jake", "Thug1"], ["Jake", "Thug2"]],
  "danger": ["Jake", "Thug1"]
}

EXAMPLE 3 - Mixed event (fight enemies, comfort ally):
eventTypes: ["combat", "emotional", "supportive", "intimate_embrace"]
eventPairs: {
  "combat": ["Sarah", "Guard"],
  "emotional": ["Sarah", "Alex"],
  "supportive": ["Sarah", "Alex"],
  "intimate_embrace": ["Sarah", "Alex"]
}

This is CRITICAL for tracking relationships correctly. Each event type MUST have its own pair entry.
</event_pairs>

<relationship_signals>
If events affect relationships, include relationshipSignals (array - one per affected pair).
Only include signals for MEANINGFUL relationship shifts, not routine interactions.

FORMAT: Array of signal objects, each with a pair and changes array.

EXAMPLE 1 - No relationship signal (routine combat with nameless enemies):
relationshipSignals: []

EXAMPLE 2 - Single signal (emotional moment between two characters):
relationshipSignals: [
  {
    pair: ["Elena", "Marcus"],
    changes: [
      { from: "Elena", toward: "Marcus", feeling: "vulnerable" },
      { from: "Marcus", toward: "Elena", feeling: "protective" }
    ]
  }
]

EXAMPLE 3 - Multiple signals (fight with named enemies who will remember):
relationshipSignals: [
  { pair: ["Jake", "Viper"], changes: [{ from: "Viper", toward: "Jake", feeling: "vengeful" }] },
  { pair: ["Jake", "Razor"], changes: [{ from: "Razor", toward: "Jake", feeling: "fearful" }] }
]

EXAMPLE 4 - Mixed (combat with enemy, emotional support from ally):
relationshipSignals: [
  { pair: ["Sarah", "Alex"], changes: [
    { from: "Alex", toward: "Sarah", feeling: "grateful" },
    { from: "Sarah", toward: "Alex", feeling: "protective" }
  ]}
]
(Note: No signal for Guard unless they're a recurring character)

IMPORTANT: Only create relationship signals for characters who will appear again.
Generic enemies, random NPCs, or one-off characters don't need signals.
</relationship_signals>

<witnesses>
- Include all characters who witnessed or participated in the event.
- This is important for dramatic irony (tracking who knows what).
</witnesses>
</instructions>

<current_relationships>
{{currentRelationships}}
</current_relationships>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the significant event (or indicate no significant event) as valid JSON:`,
	},

	chapter_boundary: {
		key: 'chapter_boundary',
		name: 'Chapter - Boundary Detection',
		description:
			'Determines if a chapter boundary has occurred and generates chapter summary',
		defaultTemperature: 0.5,
		placeholders: [
			COMMON_PLACEHOLDERS.currentEvents,
			COMMON_PLACEHOLDERS.currentRelationships,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `A potential chapter boundary has been detected (location change or time jump). Analyze whether this represents a true narrative chapter break and generate a chapter summary. You must only return valid JSON with no commentary.

<instructions>
<boundary_detection>
- A true chapter boundary marks a significant narrative transition.
- Time jumps of several hours or location changes to new areas often indicate chapters.
- Minor movements within the same scene (e.g., moving to another room in the same building) are NOT chapter boundaries.
- Consider if the narrative tone or focus has shifted significantly.
</boundary_detection>
<summary>
- Write a 2-3 sentence summary of what happened in the chapter.
- Focus on the most important events and character developments.
- Include any relationship changes.
</summary>
<outcomes>
- relationshipChanges: Note any significant shifts in how characters relate to each other.
- secretsRevealed: Any secrets that came to light.
- newComplications: New problems or tensions introduced.
</outcomes>
</instructions>

<chapter_events>
{{currentEvents}}
</chapter_events>

<current_relationships>
{{currentRelationships}}
</current_relationships>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Analyze the chapter boundary and generate summary as valid JSON:`,
	},

	relationship_initial: {
		key: 'relationship_initial',
		name: 'Relationship - Initial',
		description: 'Extracts initial relationship state between two characters',
		defaultTemperature: 0.6,
		placeholders: [
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.characterInfo,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze this roleplay scene and extract the relationship between two characters. You must only return valid JSON with no commentary.

<instructions>
<general>
- Determine the current status of the relationship (strangers, acquaintances, friendly, close, intimate, strained, hostile, complicated).
- Extract how each character feels about the other (asymmetric feelings are common and important).
- Note any secrets one character knows that the other doesn't.
- Identify what each character wants from the relationship.
</general>

<status_guidelines>
Status definitions and requirements:

- strangers: Never met or just met, no rapport
- acquaintances: Know each other casually, no strong bond
- friendly: Positive rapport, enjoy each other's company
- close: Deep friendship, trust, confide in each other. Maximum for platonic relationships.
- intimate: ONLY for romantic/sexual relationships with explicit romantic actions (kiss, date, love confession, sex)
- strained: Tension, unresolved conflict, damaged trust
- hostile: Active antagonism, enemies
- complicated: Mixed feelings, unclear relationship

CRITICAL STATUS LIMITS:
- "intimate" REQUIRES romantic actions to have occurred (first kiss, first date, love confession, sexual activity)
- Sharing secrets or emotional vulnerability alone = "close" at most, NOT "intimate"
- Caring about someone or wanting to help them = "friendly" or "close", NOT "intimate"
- "intimate" means ROMANTIC relationship, not just emotional closeness

Examples:
- Characters shared deep secrets, support each other emotionally → "close" (not intimate - no romance)
- Characters had their first kiss → can be "intimate"
- Characters confessed romantic love → can be "intimate"
- Characters care deeply about each other but no romantic actions → "close"
- Characters are suspicious but talking → "strained" or "acquaintances"
</status_guidelines>

<asymmetry>
- Each character's feelings may be very different from the other's.
- One character might be trusting while the other is suspicious.
- One might want romance while the other wants friendship.
- Capture these differences accurately.
</asymmetry>

<output_format>
Return attitudes using actual character names as keys:
{
  "status": "friendly",
  "attitudes": {
    "CharacterName1": {
      "toward": "CharacterName2",
      "feelings": ["trusting", "curious"],
      "secrets": ["knows about their past"],
      "wants": ["friendship"]
    },
    "CharacterName2": {
      "toward": "CharacterName1",
      "feelings": ["grateful", "protective"],
      "secrets": [],
      "wants": ["loyalty"]
    }
  }
}

IMPORTANT: Use the actual character names as keys, NOT "aToB" or "bToA".
The "toward" field clarifies who the feelings are directed at.
</output_format>

<secrets>
- Secrets are things one character knows about the other (or about a situation) that the other doesn't know.
- This is crucial for dramatic irony in the narrative.
- Only include actual secrets, not just information one character hasn't shared yet.
</secrets>
</instructions>

<character_info>
{{characterInfo}}
</character_info>

<scene_messages>
{{messages}}
</scene_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the relationship state as valid JSON:`,
	},

	relationship_update: {
		key: 'relationship_update',
		name: 'Relationship - Update',
		description: 'Updates relationship state based on recent events',
		defaultTemperature: 0.6,
		placeholders: [
			COMMON_PLACEHOLDERS.previousState,
			COMMON_PLACEHOLDERS.currentEvents,
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.schema,
			COMMON_PLACEHOLDERS.schemaExample,
		],
		default: `Analyze recent events and update the relationship between two characters. You must only return valid JSON with no commentary.

<instructions>
<general>
- Analyze the previous relationship state and recent events to determine the CURRENT state.
- Update status if the relationship has progressed or deteriorated.
- REPLACE feelings with what the character CURRENTLY feels - do NOT accumulate old feelings.
  - If someone was "angry" but has forgiven, remove "angry" and add appropriate new feelings.
  - Feelings should reflect the PRESENT emotional state, not a history of all feelings ever felt.
- Add new secrets if one character learned something the other doesn't know.
- Remove secrets that have been revealed or are no longer relevant.
- Update wants based on how the relationship has evolved.
</general>

<feelings_guidance>
CRITICAL: Feelings arrays should contain CURRENT feelings only, not accumulated history.

WRONG approach (accumulating):
- Previous: ["curious", "cautious"]
- After bonding: ["curious", "cautious", "trusting", "warm"]  ← BAD: old feelings remain

CORRECT approach (replacing):
- Previous: ["curious", "cautious"]
- After bonding: ["trusting", "warm", "comfortable"]  ← GOOD: reflects current state

Think: "What does this character feel RIGHT NOW about the other person?"
</feelings_guidance>

<status_guidelines>
Status definitions and requirements:

- strangers: Never met or just met, no rapport
- acquaintances: Know each other casually, no strong bond
- friendly: Positive rapport, enjoy each other's company
- close: Deep friendship, trust, confide in each other. Maximum for platonic relationships.
- intimate: ONLY for romantic/sexual relationships with explicit romantic actions (kiss, date, love confession, sex)
- strained: Tension, unresolved conflict, damaged trust
- hostile: Active antagonism, enemies
- complicated: Mixed feelings, unclear relationship

CRITICAL STATUS LIMITS:
- "intimate" REQUIRES romantic actions to have occurred (first kiss, first date, love confession, sexual activity)
- Sharing secrets or emotional vulnerability alone = "close" at most, NOT "intimate"
- Caring about someone or wanting to help them = "friendly" or "close", NOT "intimate"
- "intimate" means ROMANTIC relationship, not just emotional closeness

Examples:
- Characters shared deep secrets, support each other emotionally → "close" (not intimate - no romance)
- Characters had their first kiss → can be "intimate"
- Characters confessed romantic love → can be "intimate"
- Characters care deeply about each other but no romantic actions → "close"
- Characters are suspicious but talking → "strained" or "acquaintances"
</status_guidelines>

<output_format>
Return attitudes using actual character names as keys:
{
  "status": "close",
  "attitudes": {
    "CharacterName1": {
      "toward": "CharacterName2",
      "feelings": ["trusting", "protective", "grateful"],
      "secrets": [],
      "wants": ["continued friendship", "support"]
    },
    "CharacterName2": {
      "toward": "CharacterName1",
      "feelings": ["caring", "understanding", "hopeful"],
      "secrets": [],
      "wants": ["to help", "trust"]
    }
  }
}

IMPORTANT: Use the actual character names as keys, NOT "aToB" or "bToA".
The "toward" field clarifies who the feelings are directed at.
</output_format>

<history>
- If this is a chapter boundary update, include a history snapshot summarizing the relationship state at this point.
</history>
</instructions>

<previous_relationship>
{{previousState}}
</previous_relationship>

<recent_events>
{{currentEvents}}
</recent_events>

<recent_messages>
{{messages}}
</recent_messages>

<schema>
{{schema}}
</schema>

<output_example>
{{schemaExample}}
</output_example>

Extract the updated relationship state as valid JSON:`,
	},

	milestone_description: {
		key: 'milestone_description',
		name: 'Milestone - Description',
		description:
			'Extracts a concise, grounded description of a relationship milestone moment',
		defaultTemperature: 0.5,
		placeholders: [
			COMMON_PLACEHOLDERS.messages,
			COMMON_PLACEHOLDERS.milestoneType,
			COMMON_PLACEHOLDERS.characterPair,
			COMMON_PLACEHOLDERS.timeOfDay,
			COMMON_PLACEHOLDERS.location,
			COMMON_PLACEHOLDERS.props,
			COMMON_PLACEHOLDERS.characters,
			COMMON_PLACEHOLDERS.relationship,
			COMMON_PLACEHOLDERS.eventDetail,
		],
		default: `Extract a brief description of this {{milestoneType}} moment. Return ONLY the description text, no JSON, no quotes, no commentary.

<context>
<milestone_type>{{milestoneType}}</milestone_type>
<character_pair>{{characterPair}}</character_pair>
<time_of_day>{{timeOfDay}}</time_of_day>
<location>{{location}}</location>
<nearby_props>{{props}}</nearby_props>
<event_detail>{{eventDetail}}</event_detail>
<character_details>
{{characters}}
</character_details>
<relationship_state>
{{relationship}}
</relationship_state>
</context>

<instructions>
Write 1-2 sentences describing ONLY the specific {{milestoneType}} moment between {{characterPair}}.

FOCUS: Describe the exact moment of the milestone - not the entire conversation or scene.
- For first_kiss: describe the kiss itself, not everything that led to it
- For secret_shared: describe what secret was shared (use the event_detail)
- For first_embrace: describe the embrace itself

REQUIREMENTS:
- Use the event_detail field - it tells you exactly what happened
- Reference location and time of day
- Be factual and concise, not flowery
- Write in past tense, third person
- Do NOT summarize the whole scene - ONLY the milestone moment
</instructions>

<examples>
<example milestone="first_kiss">
<time_of_day>evening</time_of_day>
<location>Downtown - The Blue Moon Bar - Corner booth</location>
<props>half-empty glasses, dim overhead light</props>
<character_details>
Elena: Position: leaning across booth | Mood: nervous, anticipating | Wearing: torso: red blouse
Marcus: Position: sitting across from her | Mood: intent, warm | Wearing: torso: dark suit jacket
</character_details>
<relationship_state>Elena & Marcus (close): Elena feels: attracted, hopeful | Marcus feels: protective, drawn</relationship_state>
<messages>
Elena: *She leaned closer across the booth* "I've been thinking about this all night."
Marcus: *He reached over and cupped her cheek* "Me too." *He kissed her*
</messages>
<description>
Elena and Marcus shared their first kiss in the corner booth of the Blue Moon Bar that evening, leaning across the table between their half-empty drinks.
</description>
</example>

<example milestone="first_embrace">
<time_of_day>afternoon</time_of_day>
<location>Westside - Elena's Apartment - Living room</location>
<props>couch, scattered tissues, muted TV</props>
<character_details>
Elena: Position: sitting on couch | Mood: devastated, vulnerable | Wearing: torso: oversized sweater
Marcus: Position: sitting beside her | Mood: concerned, gentle | Wearing: torso: t-shirt, jacket: leather jacket
</character_details>
<relationship_state>Elena & Marcus (friendly): Elena feels: grateful, needing support | Marcus feels: protective, caring</relationship_state>
<messages>
Marcus: *He found her on the couch, crying* "Hey. I came as soon as I heard."
Elena: *She looked up* "I didn't think you'd come."
Marcus: *He sat beside her and pulled her into a hug* "Of course I came."
</messages>
<description>
Marcus held Elena for the first time on her couch that afternoon, pulling her in while she cried about her father's diagnosis.
</description>
</example>

<example milestone="first_conflict">
<time_of_day>night</time_of_day>
<location>Marcus's Office - Private study</location>
<props>desk, papers, whiskey glass</props>
<character_details>
Elena: Position: standing at desk | Mood: furious, betrayed | Wearing: torso: work blouse
Marcus: Position: behind desk | Mood: defensive, guilty | Wearing: torso: dress shirt, sleeves rolled
</character_details>
<relationship_state>Elena & Marcus (intimate): Elena feels: betrayed, hurt | Marcus feels: guilty, desperate</relationship_state>
<messages>
Elena: *She threw the documents on his desk* "You've been lying to me this whole time."
Marcus: "I was trying to protect you—"
Elena: "Don't. Just don't." *She walked out*
</messages>
<description>
Their first real fight happened in Marcus's study when Elena confronted him with the documents proving his deception. She walked out before he could explain.
</description>
</example>

<example milestone="confession">
<time_of_day>morning</time_of_day>
<location>Riverside Park - Bench near the fountain</location>
<props>coffee cups, park bench</props>
<character_details>
Elena: Position: sitting on bench | Mood: nervous, determined | Wearing: jacket: light cardigan
Marcus: Position: sitting beside her | Mood: attentive, curious | Wearing: torso: casual shirt
</character_details>
<relationship_state>Elena & Marcus (close): Elena feels: in love, scared | Marcus feels: comfortable, uncertain</relationship_state>
<messages>
Elena: *She stared at her coffee* "I need to tell you something."
Marcus: *He waited*
Elena: "I'm in love with you. I have been for a while."
</messages>
<description>
Elena confessed her feelings on a park bench that morning, gripping her coffee cup as she finally admitted she'd been in love with Marcus for a while.
</description>
</example>

<example milestone="first_laugh">
<time_of_day>evening</time_of_day>
<location>Downtown - Ramen Shop - Counter seats</location>
<props>steaming ramen bowls, chopsticks, napkins</props>
<character_details>
Elena: Position: sitting at counter | Mood: amused, relaxed | Wearing: jacket: denim jacket
Marcus: Position: sitting beside her | Mood: playful, grinning | Wearing: torso: hoodie
</character_details>
<relationship_state>Elena & Marcus (acquaintances): Elena feels: warming up, curious | Marcus feels: interested, comfortable</relationship_state>
<messages>
Marcus: *He slurped his noodles loudly, getting broth on his chin* "That's how you're supposed to eat ramen. Trust me."
Elena: *She burst out laughing* "You look ridiculous."
Marcus: *He grinned, not wiping his face* "But am I wrong?"
</messages>
<description>
Their first genuine laugh together came at the ramen shop that evening when Marcus deliberately slurped his noodles and got broth all over his chin, making Elena burst out laughing despite herself.
</description>
</example>

<example milestone="first_gift">
<time_of_day>afternoon</time_of_day>
<location>Elena's Apartment - Doorway</location>
<props>doorframe, mailbox, potted plant</props>
<character_details>
Elena: Position: standing in doorway | Mood: surprised, touched | Wearing: torso: casual sweater
Marcus: Position: standing at door | Mood: nervous, hopeful | Wearing: jacket: coat, torso: button-up
</character_details>
<relationship_state>Elena & Marcus (friendly): Elena feels: appreciating, curious | Marcus feels: eager, nervous</relationship_state>
<messages>
Marcus: *He held out a small wrapped box* "I saw this and thought of you."
Elena: *She unwrapped it to find a vintage compass* "Marcus... this is beautiful."
Marcus: "So you'll always find your way home."
</messages>
<description>
Marcus gave Elena her first gift at her apartment door that afternoon—a vintage compass he'd found, saying it was so she'd always find her way home.
</description>
</example>
</examples>

<recent_messages>
{{messages}}
</recent_messages>

Write the milestone description:`,
	},
};

// ============================================
// Public API
// ============================================

/**
 * Get a prompt by key, using custom prompt from settings if available.
 */
export function getPrompt(key: PromptKey): string {
	const settings = getSettings();
	const customPrompts = settings.customPrompts as CustomPrompts | undefined;

	if (customPrompts?.[key]) {
		return customPrompts[key];
	}

	return DEFAULT_PROMPTS[key].default;
}

/**
 * Get all prompt definitions for UI display.
 */
export function getAllPromptDefinitions(): PromptDefinition[] {
	return Object.values(DEFAULT_PROMPTS);
}

/**
 * Get a specific prompt definition.
 */
export function getPromptDefinition(key: PromptKey): PromptDefinition {
	return DEFAULT_PROMPTS[key];
}

/**
 * Check if a prompt has been customized.
 */
export function isPromptCustomized(key: PromptKey): boolean {
	const settings = getSettings();
	const customPrompts = settings.customPrompts as CustomPrompts | undefined;
	return !!customPrompts?.[key];
}

/**
 * Get placeholder documentation for a prompt.
 */
export function getPlaceholderDocs(key: PromptKey): PromptPlaceholder[] {
	return DEFAULT_PROMPTS[key].placeholders;
}
