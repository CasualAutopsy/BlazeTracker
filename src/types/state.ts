// ============================================
// Runtime State Types
// ============================================

export interface NarrativeDateTime {
	year: number;
	month: number; // 1-12
	day: number; // 1-31
	hour: number; // 0-23
	minute: number; // 0-59
	second: number; // 0-59
	dayOfWeek: string; // "Monday", "Tuesday", etc.
}

/**
 * TrackedState contains all extracted scene information.
 * All fields are optional - they will only be present if their
 * respective extraction module is enabled in settings.
 */
export interface TrackedState {
	time?: NarrativeDateTime;
	location?: LocationState;
	climate?: Climate | ProceduralClimate;
	scene?: Scene;
	characters?: Character[];
	/** Current chapter index (0-based) */
	currentChapter?: number;
	/** Events extracted from recent messages in the current chapter */
	currentEvents?: TimestampedEvent[];
	/** Summary of chapter that just ended (set on messages where chapter boundary was detected) */
	chapterEnded?: ChapterEndedSummary;
}

/** Summary shown when a chapter ends */
export interface ChapterEndedSummary {
	/** Chapter index that ended (0-based) */
	index: number;
	/** Chapter title */
	title: string;
	/** Brief summary of the chapter */
	summary: string;
	/** Number of events that were in the chapter */
	eventCount: number;
	/** Why the chapter ended */
	reason: 'location_change' | 'time_jump' | 'both' | 'manual';
}

export interface LocationState {
	area: string;
	place: string;
	position: string;
	props: string[];
}

/**
 * Legacy climate type - kept for backward compatibility
 */
export interface Climate {
	weather: 'sunny' | 'cloudy' | 'snowy' | 'rainy' | 'windy' | 'thunderstorm';
	temperature: number;
}

/**
 * Weather condition types for procedural weather
 */
export type WeatherCondition =
	| 'clear'
	| 'sunny'
	| 'partly_cloudy'
	| 'overcast'
	| 'foggy'
	| 'drizzle'
	| 'rain'
	| 'heavy_rain'
	| 'thunderstorm'
	| 'sleet'
	| 'snow'
	| 'heavy_snow'
	| 'blizzard'
	| 'windy'
	| 'hot'
	| 'cold'
	| 'humid';

export type DaylightPhase = 'dawn' | 'day' | 'dusk' | 'night';

export type BuildingType = 'modern' | 'heated' | 'unheated' | 'underground' | 'tent' | 'vehicle';

export type BaseClimateType =
	| 'temperate'
	| 'desert'
	| 'arctic'
	| 'tropical'
	| 'mediterranean'
	| 'continental'
	| 'oceanic';

/**
 * Extended climate type for procedural weather system
 */
export interface ProceduralClimate {
	temperature: number; // Effective temp (indoor if inside) °F
	outdoorTemperature: number; // Always outside temp °F
	indoorTemperature?: number; // Set when indoors °F
	feelsLike: number; // Wind chill / heat index °F
	humidity: number; // 0-100%
	precipitation: number; // inches
	cloudCover: number; // 0-100%
	windSpeed: number; // mph
	windDirection: string; // "NW", "SE", etc.
	conditions: string; // Human-readable description
	conditionType: WeatherCondition;
	uvIndex: number;
	daylight: DaylightPhase;
	isIndoors: boolean;
	buildingType?: BuildingType;
}

// Weather-related types are imported from weather module
// Import them for use in this file and re-export for convenience
import type {
	LocationMapping as WeatherLocationMapping,
	ForecastCacheEntry as WeatherForecastCacheEntry,
	LocationForecast as WeatherLocationForecast,
} from '../weather/types';

export type LocationMapping = WeatherLocationMapping;
export type ForecastCacheEntry = WeatherForecastCacheEntry;
export type LocationForecast = WeatherLocationForecast;

export interface Scene {
	topic: string;
	tone: string;
	tension: {
		level: TensionLevel;
		direction: TensionDirection;
		type: TensionType;
	};
	// Note: recentEvents removed in v1.0.0, replaced by currentEvents on TrackedState
}

export type TensionLevel =
	| 'relaxed'
	| 'aware'
	| 'guarded'
	| 'tense'
	| 'charged'
	| 'volatile'
	| 'explosive';
export type TensionDirection = 'escalating' | 'stable' | 'decreasing';
export type TensionType =
	| 'confrontation'
	| 'intimate'
	| 'vulnerable'
	| 'celebratory'
	| 'negotiation'
	| 'suspense'
	| 'conversation';

// ============================================
// Event Types
// ============================================

/**
 * Event type flags - multiple can apply to a single event.
 */
export type EventType =
	// Conversation & Social
	| 'conversation' // General dialogue, discussion
	| 'confession' // Admitting feelings, revealing truth
	| 'argument' // Verbal conflict, disagreement
	| 'negotiation' // Making deals, compromises

	// Discovery & Information
	| 'discovery' // Learning new information
	| 'secret_shared' // Sharing a secret with someone
	| 'secret_revealed' // Secret exposed (possibly unwillingly)

	// Emotional
	| 'emotional' // Emotional vulnerability, comfort
	| 'supportive' // Providing emotional support
	| 'rejection' // Rejecting someone's advances/request
	| 'comfort' // Comforting someone in distress
	| 'apology' // Apologizing for something
	| 'forgiveness' // Forgiving someone

	// Bonding & Connection
	| 'laugh' // Sharing a laugh, humor, joy together
	| 'gift' // Giving or receiving a gift
	| 'compliment' // Giving sincere praise or compliment
	| 'tease' // Playful teasing, banter
	| 'flirt' // Flirtatious behavior
	| 'date' // Going on a date or romantic outing
	| 'i_love_you' // Saying "I love you" or equivalent declaration
	| 'sleepover' // Sleeping over together (non-sexual)
	| 'shared_meal' // Eating together
	| 'shared_activity' // Doing an activity together (games, hobbies, etc.)

	// Intimacy Levels (granular for romantic RP)
	| 'intimate_touch' // Hand-holding, caressing, non-sexual touch
	| 'intimate_kiss' // Kissing
	| 'intimate_embrace' // Hugging, cuddling, holding
	| 'intimate_heated' // Making out, heavy petting, grinding

	// Sexual Activity (activity-based granularity)
	| 'intimate_foreplay' // Teasing, undressing, leading up to sex
	| 'intimate_oral' // Oral sexual activity
	| 'intimate_manual' // Manual stimulation (hands, fingers)
	| 'intimate_penetrative' // Penetrative sex
	| 'intimate_climax' // Orgasm, completion

	// Action & Physical
	| 'action' // Physical activity, doing something
	| 'combat' // Fighting, violence
	| 'danger' // Threat, peril, risk

	// Decisions & Commitments
	| 'decision' // Making a choice
	| 'promise' // Making a commitment
	| 'betrayal' // Breaking trust
	| 'lied' // Told a lie or deceived someone

	// Life Events
	| 'exclusivity' // Committing to exclusivity
	| 'marriage' // Getting married
	| 'pregnancy' // Pregnancy-related event
	| 'childbirth' // Having a child

	// Social & Achievement
	| 'social' // Meeting people, social dynamics
	| 'achievement' // Accomplishment, success

	// Support & Protection (friendly/close gate milestones)
	| 'helped' // Helped with something significant
	| 'common_interest' // Discovered shared interest
	| 'outing' // Went somewhere together casually
	| 'defended' // Defended or stood up for them
	| 'crisis_together' // Went through danger together
	| 'vulnerability' // Showed weakness/vulnerability
	| 'entrusted'; // Entrusted with something important

export const EVENT_TYPES: readonly EventType[] = [
	'conversation',
	'confession',
	'argument',
	'negotiation',
	'discovery',
	'secret_shared',
	'secret_revealed',
	'emotional',
	'supportive',
	'rejection',
	'comfort',
	'apology',
	'forgiveness',
	'laugh',
	'gift',
	'compliment',
	'tease',
	'flirt',
	'date',
	'i_love_you',
	'sleepover',
	'shared_meal',
	'shared_activity',
	'intimate_touch',
	'intimate_kiss',
	'intimate_embrace',
	'intimate_heated',
	'intimate_foreplay',
	'intimate_oral',
	'intimate_manual',
	'intimate_penetrative',
	'intimate_climax',
	'action',
	'combat',
	'danger',
	'decision',
	'promise',
	'betrayal',
	'lied',
	'exclusivity',
	'marriage',
	'pregnancy',
	'childbirth',
	'social',
	'achievement',
	'helped',
	'common_interest',
	'outing',
	'defended',
	'crisis_together',
	'vulnerability',
	'entrusted',
];

/**
 * Event type groups for UI display.
 */
export const EVENT_TYPE_GROUPS = {
	conversation: ['conversation', 'confession', 'argument', 'negotiation'],
	discovery: ['discovery', 'secret_shared', 'secret_revealed'],
	emotional: ['emotional', 'supportive', 'rejection', 'comfort', 'apology', 'forgiveness'],
	bonding: [
		'laugh',
		'gift',
		'compliment',
		'tease',
		'flirt',
		'date',
		'i_love_you',
		'sleepover',
		'shared_meal',
		'shared_activity',
	],
	intimacy_romantic: [
		'intimate_touch',
		'intimate_kiss',
		'intimate_embrace',
		'intimate_heated',
	],
	intimacy_sexual: [
		'intimate_foreplay',
		'intimate_oral',
		'intimate_manual',
		'intimate_penetrative',
		'intimate_climax',
	],
	action: ['action', 'combat', 'danger'],
	commitment: ['decision', 'promise', 'betrayal', 'lied'],
	life_events: ['exclusivity', 'marriage', 'pregnancy', 'childbirth'],
	social: ['social', 'achievement'],
	support: [
		'helped',
		'common_interest',
		'outing',
		'defended',
		'crisis_together',
		'vulnerability',
		'entrusted',
	],
} as const;

/**
 * A significant event extracted from a message pair.
 */
export interface TimestampedEvent {
	/** Narrative timestamp when the event occurred */
	timestamp: NarrativeDateTime;
	/** Brief summary of what happened (1-2 sentences) */
	summary: string;
	/** Event type flags - multiple can apply */
	eventTypes: EventType[];
	/** Tension type at the moment of this event */
	tensionType: TensionType;
	/** Tension level at the moment of this event */
	tensionLevel: TensionLevel;
	/** Characters who witnessed/participated in this event */
	witnesses: string[];
	/** Location summary where event occurred */
	location: string;
	/** Optional relationship signal if this event affects relationships */
	relationshipSignal?: RelationshipSignal;
	/** Message ID that generated this event (for re-extraction cleanup) */
	messageId?: number;
}

/**
 * Signal indicating a relationship change detected in an event.
 */
export interface RelationshipSignal {
	/** The two characters involved (alphabetically sorted) */
	pair: [string, string];
	/** Directional attitude changes */
	changes?: DirectionalChange[];
	/** Milestone events if this represents significant relationship moments (multiple possible) */
	milestones?: MilestoneEvent[];
}

/**
 * A directional attitude change from one character toward another.
 */
export interface DirectionalChange {
	/** Character whose attitude is changing */
	from: string;
	/** Character they feel differently about */
	toward: string;
	/** New or changed feeling (e.g., "growing trust", "suspicion") */
	feeling: string;
}

/**
 * A milestone event in a relationship.
 */
export interface MilestoneEvent {
	type: MilestoneType;
	/** Flowery description of the milestone moment */
	description: string;
	/** Narrative timestamp when milestone occurred */
	timestamp: NarrativeDateTime;
	/** Location where milestone occurred (format: "place, area") */
	location: string;
	/** Message ID that created this milestone (for re-extraction cleanup) */
	messageId?: number;
}

export type MilestoneType =
	// Relationship firsts
	| 'first_meeting'
	| 'first_conflict'
	| 'first_alliance'

	// Emotional milestones
	| 'confession' // Confessing feelings
	| 'emotional_intimacy' // Deep emotional connection/vulnerability

	// Bonding milestones (friendly gate)
	| 'first_laugh' // First shared genuine laugh
	| 'first_gift' // First gift exchanged
	| 'first_date' // First date or romantic outing
	| 'first_i_love_you' // First declaration of love
	| 'first_sleepover' // First time sleeping over together (non-sexual)
	| 'first_shared_meal' // First meal shared together
	| 'first_shared_activity' // First activity done together
	| 'first_compliment' // First sincere compliment
	| 'first_tease' // First playful teasing
	| 'first_helped' // First time helping
	| 'first_common_interest' // First shared interest discovered
	| 'first_outing' // First casual outing together

	// Physical intimacy milestones (granular)
	| 'first_touch' // First meaningful physical contact (hand-holding, etc.)
	| 'first_kiss' // First kiss
	| 'first_embrace' // First hug/cuddle
	| 'first_heated' // First making out / heavy petting

	// Sexual milestones (atomic, matching event types)
	| 'first_foreplay' // First sexual foreplay
	| 'first_oral' // First oral sexual activity
	| 'first_manual' // First manual stimulation
	| 'first_penetrative' // First penetrative sex
	| 'first_climax' // First climax together

	// Life commitment milestones
	| 'promised_exclusivity' // Committed to exclusivity
	| 'marriage' // Got married
	| 'pregnancy' // Pregnancy discovered
	| 'had_child' // Child was born

	// Trust & commitment (close gate)
	| 'promise_made'
	| 'promise_broken'
	| 'betrayal'
	| 'reconciliation'
	| 'sacrifice'
	| 'first_support' // First emotional support
	| 'first_comfort' // First time comforting
	| 'defended' // Defended them
	| 'crisis_together' // Faced danger together
	| 'first_vulnerability' // First vulnerability shown
	| 'trusted_with_task' // Entrusted with task

	// Secrets
	| 'secret_shared'
	| 'secret_revealed'

	// Conflicts
	| 'major_argument'
	| 'major_reconciliation';

// ============================================
// Chapter Types
// ============================================

/**
 * A chapter represents a narrative segment with coherent time/location.
 */
export interface Chapter {
	/** 0-based chapter index */
	index: number;
	/** AI-generated chapter title */
	title: string;
	/** Brief summary of what happened */
	summary: string;
	/** Time range of the chapter */
	timeRange: {
		start: NarrativeDateTime;
		end: NarrativeDateTime;
	};
	/** Location where most of the chapter took place */
	primaryLocation: string;
	/** Events that occurred during this chapter (archived from currentEvents) */
	events: TimestampedEvent[];
	/** Outcomes extracted when chapter closed */
	outcomes: ChapterOutcomes;
}

/**
 * Outcomes extracted when a chapter is finalized.
 */
export interface ChapterOutcomes {
	/** Relationships that changed during this chapter */
	relationshipChanges: string[];
	/** Secrets that were revealed */
	secretsRevealed: string[];
	/** New complications introduced */
	newComplications: string[];
}

// ============================================
// Relationship Types
// ============================================

export type RelationshipStatus =
	| 'strangers'
	| 'acquaintances'
	| 'friendly'
	| 'close'
	| 'intimate'
	| 'strained'
	| 'hostile'
	| 'complicated';

/**
 * A versioned snapshot of relationship state at a status change.
 */
export interface RelationshipVersion {
	/** Message ID when this version was created */
	messageId: number;
	/** Relationship status at this version */
	status: RelationshipStatus;
	/** A's attitude toward B at this version */
	aToB: RelationshipAttitude;
	/** B's attitude toward A at this version */
	bToA: RelationshipAttitude;
	/** Milestones at this version */
	milestones: MilestoneEvent[];
}

/**
 * A relationship between two characters.
 */
export interface Relationship {
	/** Sorted pair of character names */
	pair: [string, string];
	/** Current relationship status */
	status: RelationshipStatus;
	/** How A feels about B */
	aToB: RelationshipAttitude;
	/** How B feels about A */
	bToA: RelationshipAttitude;
	/** Milestones in this relationship */
	milestones: MilestoneEvent[];
	/** Historical snapshots at chapter boundaries */
	history: RelationshipSnapshot[];
	/** Version history - snapshots at each status change */
	versions: RelationshipVersion[];
}

/**
 * One character's attitude toward another.
 */
export interface RelationshipAttitude {
	/** Current feelings (e.g., "trusting", "suspicious", "attracted") */
	feelings: string[];
	/** What they know that the other doesn't (for dramatic irony) */
	secrets: string[];
	/** What they want from the relationship */
	wants: string[];
}

/**
 * A snapshot of relationship state at a chapter boundary.
 */
export interface RelationshipSnapshot {
	chapterIndex: number;
	status: RelationshipStatus;
	summary: string;
}

// ============================================
// Chat-Level Narrative State
// ============================================

/**
 * Chat-level narrative state stored in message 0.
 * Contains information that spans the entire chat.
 */
export interface NarrativeState {
	/** Schema version for migrations */
	version: number;
	/** Completed chapters */
	chapters: Chapter[];
	/** All tracked relationships */
	relationships: Relationship[];
	/** Cached weather forecasts by location */
	forecastCache: ForecastCacheEntry[];
	/** Fantasy location → real-world climate mappings */
	locationMappings: LocationMapping[];
}

// ============================================
// Character Types (simplified in v1.0.0)
// ============================================

export interface Character {
	name: string;
	position: string;
	activity?: string;
	// Note: goals removed in v1.0.0, now tracked in CharacterArc
	mood: string[];
	physicalState?: string[];
	outfit: CharacterOutfit;
	// Note: dispositions removed in v1.0.0, now tracked in Relationship
}

export interface CharacterOutfit {
	head: string | null;
	neck: string | null; // necklaces, chokers, scarves, ties
	jacket: string | null;
	back: string | null; // backpacks, quivers, cloaks, capes
	torso: string | null;
	legs: string | null;
	footwear: string | null;
	socks: string | null;
	underwear: string | null;
}

export interface StoredStateData {
	state: TrackedState;
	extractedAt: string;
}

// ============================================
// Constants
// ============================================

export const NARRATIVE_STATE_VERSION = 2;

export const TENSION_LEVELS: readonly TensionLevel[] = [
	'relaxed',
	'aware',
	'guarded',
	'tense',
	'charged',
	'volatile',
	'explosive',
];

export const TENSION_TYPES: readonly TensionType[] = [
	'confrontation',
	'intimate',
	'vulnerable',
	'celebratory',
	'negotiation',
	'suspense',
	'conversation',
];

export const RELATIONSHIP_STATUSES: readonly RelationshipStatus[] = [
	'strangers',
	'acquaintances',
	'friendly',
	'close',
	'intimate',
	'strained',
	'hostile',
	'complicated',
];

export const MILESTONE_TYPES: readonly MilestoneType[] = [
	// Relationship firsts
	'first_meeting',
	'first_conflict',
	'first_alliance',
	// Emotional
	'confession',
	'emotional_intimacy',
	// Bonding (friendly gate)
	'first_laugh',
	'first_gift',
	'first_date',
	'first_i_love_you',
	'first_sleepover',
	'first_shared_meal',
	'first_shared_activity',
	'first_compliment',
	'first_tease',
	'first_helped',
	'first_common_interest',
	'first_outing',
	// Physical intimacy (granular)
	'first_touch',
	'first_kiss',
	'first_embrace',
	'first_heated',
	// Sexual milestones (atomic)
	'first_foreplay',
	'first_oral',
	'first_manual',
	'first_penetrative',
	'first_climax',
	// Life commitment
	'promised_exclusivity',
	'marriage',
	'pregnancy',
	'had_child',
	// Trust & commitment (close gate)
	'promise_made',
	'promise_broken',
	'betrayal',
	'reconciliation',
	'sacrifice',
	'first_support',
	'first_comfort',
	'defended',
	'crisis_together',
	'first_vulnerability',
	'trusted_with_task',
	// Secrets
	'secret_shared',
	'secret_revealed',
	// Conflicts
	'major_argument',
	'major_reconciliation',
];
