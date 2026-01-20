import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMessageState, setMessageState } from './messageState';
import type { ChatMessage } from '../types/st';
import type { StoredStateData } from '../types/state';

// Mock the EXTENSION_KEY constant
vi.mock('../constants', () => ({
	EXTENSION_KEY: 'blazetracker',
}));

// Helper to create a minimal chat message
function createMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		name: 'Test',
		is_user: false,
		mes: 'Test message',
		send_date: '2024-01-01',
		swipe_id: 0,
		...overrides,
	};
}

// Helper to create minimal state data
function createStateData(overrides: Partial<StoredStateData> = {}): StoredStateData {
	return {
		state: {
			time: {
				year: 2024,
				month: 6,
				day: 15,
				hour: 12,
				minute: 0,
				second: 0,
				dayOfWeek: 'Saturday',
			},
			location: {
				area: 'Test Area',
				place: 'Test Place',
				position: 'Test Position',
				props: [],
			},
			climate: {
				weather: 'sunny',
				temperature: 72,
			},
			characters: [],
		},
		extractedAt: '2024-01-01T00:00:00Z',
		...overrides,
	};
}

describe('getMessageState', () => {
	it('returns null when message has no extra', () => {
		const message = createMessage();
		delete message.extra;
		expect(getMessageState(message)).toBeNull();
	});

	it('returns null when extra has no extension key', () => {
		const message = createMessage({ extra: {} });
		expect(getMessageState(message)).toBeNull();
	});

	it('returns null when extension key has no data for swipe', () => {
		const message = createMessage({
			swipe_id: 0,
			extra: { blazetracker: {} },
		});
		expect(getMessageState(message)).toBeNull();
	});

	it('returns state for swipe_id 0', () => {
		const stateData = createStateData();
		const message = createMessage({
			swipe_id: 0,
			extra: { blazetracker: { 0: stateData } },
		});
		expect(getMessageState(message)).toEqual(stateData);
	});

	it('returns state for non-zero swipe_id', () => {
		const stateData = createStateData();
		const message = createMessage({
			swipe_id: 2,
			extra: { blazetracker: { 2: stateData } },
		});
		expect(getMessageState(message)).toEqual(stateData);
	});

	it('returns correct state when multiple swipes exist', () => {
		const stateData0 = createStateData({ extractedAt: '2024-01-01T00:00:00Z' });
		const stateData1 = createStateData({ extractedAt: '2024-01-02T00:00:00Z' });
		const message = createMessage({
			swipe_id: 1,
			extra: { blazetracker: { 0: stateData0, 1: stateData1 } },
		});
		expect(getMessageState(message)).toEqual(stateData1);
	});

	it('treats undefined swipe_id as 0', () => {
		const stateData = createStateData();
		const message = createMessage({
			extra: { blazetracker: { 0: stateData } },
		});
		delete (message as { swipe_id?: number }).swipe_id;
		expect(getMessageState(message)).toEqual(stateData);
	});
});

describe('setMessageState', () => {
	it('creates extra object if not present', () => {
		const message = createMessage();
		delete message.extra;
		const stateData = createStateData();

		setMessageState(message, stateData);

		expect(message.extra).toBeDefined();
		expect(message.extra!.blazetracker).toBeDefined();
	});

	it('creates extension key if not present', () => {
		const message = createMessage({ extra: {} });
		const stateData = createStateData();

		setMessageState(message, stateData);

		expect(message.extra!.blazetracker).toBeDefined();
	});

	it('sets state for swipe_id 0', () => {
		const message = createMessage({ swipe_id: 0, extra: {} });
		const stateData = createStateData();

		setMessageState(message, stateData);

		expect((message.extra!.blazetracker as Record<number, unknown>)[0]).toEqual(stateData);
	});

	it('sets state for non-zero swipe_id', () => {
		const message = createMessage({ swipe_id: 3, extra: {} });
		const stateData = createStateData();

		setMessageState(message, stateData);

		expect((message.extra!.blazetracker as Record<number, unknown>)[3]).toEqual(stateData);
	});

	it('preserves existing swipe states', () => {
		const stateData0 = createStateData({ extractedAt: '2024-01-01T00:00:00Z' });
		const stateData1 = createStateData({ extractedAt: '2024-01-02T00:00:00Z' });
		const message = createMessage({
			swipe_id: 1,
			extra: { blazetracker: { 0: stateData0 } },
		});

		setMessageState(message, stateData1);

		const storage = message.extra!.blazetracker as Record<number, unknown>;
		expect(storage[0]).toEqual(stateData0);
		expect(storage[1]).toEqual(stateData1);
	});

	it('overwrites existing state for same swipe_id', () => {
		const oldState = createStateData({ extractedAt: '2024-01-01T00:00:00Z' });
		const newState = createStateData({ extractedAt: '2024-01-02T00:00:00Z' });
		const message = createMessage({
			swipe_id: 0,
			extra: { blazetracker: { 0: oldState } },
		});

		setMessageState(message, newState);

		expect((message.extra!.blazetracker as Record<number, unknown>)[0]).toEqual(newState);
	});

	it('treats undefined swipe_id as 0', () => {
		const message = createMessage({ extra: {} });
		delete (message as { swipe_id?: number }).swipe_id;
		const stateData = createStateData();

		setMessageState(message, stateData);

		expect((message.extra!.blazetracker as Record<number, unknown>)[0]).toEqual(stateData);
	});

	it('preserves other extra data', () => {
		const message = createMessage({
			extra: { otherExtension: { foo: 'bar' } },
		});
		const stateData = createStateData();

		setMessageState(message, stateData);

		expect(message.extra!.otherExtension).toEqual({ foo: 'bar' });
	});
});

describe('getMessageState and setMessageState integration', () => {
	it('can retrieve state that was just set', () => {
		const message = createMessage({ extra: {} });
		const stateData = createStateData();

		setMessageState(message, stateData);
		const retrieved = getMessageState(message);

		expect(retrieved).toEqual(stateData);
	});

	it('can update and retrieve state multiple times', () => {
		const message = createMessage({ extra: {} });
		const state1 = createStateData({ extractedAt: '2024-01-01T00:00:00Z' });
		const state2 = createStateData({ extractedAt: '2024-01-02T00:00:00Z' });

		setMessageState(message, state1);
		expect(getMessageState(message)).toEqual(state1);

		setMessageState(message, state2);
		expect(getMessageState(message)).toEqual(state2);
	});

	it('handles multiple swipes correctly', () => {
		const message = createMessage({ swipe_id: 0, extra: {} });
		const state0 = createStateData({ extractedAt: '2024-01-01T00:00:00Z' });
		const state1 = createStateData({ extractedAt: '2024-01-02T00:00:00Z' });

		setMessageState(message, state0);

		message.swipe_id = 1;
		setMessageState(message, state1);

		message.swipe_id = 0;
		expect(getMessageState(message)).toEqual(state0);

		message.swipe_id = 1;
		expect(getMessageState(message)).toEqual(state1);
	});
});
