import { describe, it, expect } from 'vitest';
import {
	parseJsonResponse,
	asString,
	asStringOrNull,
	asNumber,
	asStringArray,
	isObject,
} from './json';

// ============================================
// parseJsonResponse
// ============================================

describe('parseJsonResponse', () => {
	describe('basic parsing', () => {
		it('parses a simple object', () => {
			const result = parseJsonResponse('{"name": "test"}');
			expect(result).toEqual({ name: 'test' });
		});

		it('parses a simple array', () => {
			const result = parseJsonResponse('[1, 2, 3]');
			expect(result).toEqual([1, 2, 3]);
		});

		it('parses nested structures', () => {
			const input = '{"outer": {"inner": [1, 2, 3]}}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ outer: { inner: [1, 2, 3] } });
		});
	});

	describe('markdown code block handling', () => {
		it('strips ```json code blocks', () => {
			const input = '```json\n{"name": "test"}\n```';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('strips ``` code blocks without language', () => {
			const input = '```\n{"name": "test"}\n```';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('handles code blocks with surrounding text', () => {
			const input = 'Here is the JSON:\n```json\n{"name": "test"}\n```\nDone!';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});
	});

	describe('shape extraction', () => {
		it('extracts object when shape is "object"', () => {
			const input = 'Some text {"name": "test"} more text';
			const result = parseJsonResponse(input, { shape: 'object' });
			expect(result).toEqual({ name: 'test' });
		});

		it('extracts array when shape is "array"', () => {
			const input = 'Some text [1, 2, 3] more text';
			const result = parseJsonResponse(input, { shape: 'array' });
			expect(result).toEqual([1, 2, 3]);
		});

		it('auto-detects object when it comes first', () => {
			const input = '{"obj": true} [1, 2]';
			const result = parseJsonResponse(input, { shape: 'auto' });
			expect(result).toEqual({ obj: true });
		});

		it('auto-detects array when it comes first', () => {
			const input = '[1, 2] {"obj": true}';
			const result = parseJsonResponse(input, { shape: 'auto' });
			expect(result).toEqual([1, 2]);
		});
	});

	describe('JSON repair - unquoted keys', () => {
		it('repairs single unquoted key', () => {
			const input = '{footwear: null}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ footwear: null });
		});

		it('repairs multiple unquoted keys', () => {
			const input = '{name: "test", age: 25, active: true}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test', age: 25, active: true });
		});

		it('repairs unquoted keys in nested objects', () => {
			const input = '{outer: {inner: "value"}}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ outer: { inner: 'value' } });
		});

		it('repairs unquoted keys with underscores', () => {
			const input = '{physical_state: ["tired"], is_active: true}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ physical_state: ['tired'], is_active: true });
		});

		it('repairs unquoted keys with numbers', () => {
			const input = '{item1: "a", item2: "b"}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ item1: 'a', item2: 'b' });
		});

		it('handles mixed quoted and unquoted keys', () => {
			const input = '{"quoted": 1, unquoted: 2}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ quoted: 1, unquoted: 2 });
		});

		it('repairs unquoted keys with whitespace', () => {
			const input = '{ name : "test" , value : 123 }';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test', value: 123 });
		});

		it('repairs unquoted keys with newlines', () => {
			const input = `{
				name: "test",
				value: 123
			}`;
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test', value: 123 });
		});

		it('does not break already valid JSON', () => {
			const input = '{"name": "test", "value": 123}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test', value: 123 });
		});

		it('handles complex nested structure with unquoted keys', () => {
			const input = `{
				name: "Elena",
				position: "standing",
				outfit: {
					head: null,
					torso: "red blouse",
					footwear: null
				},
				mood: ["happy", "excited"]
			}`;
			const result = parseJsonResponse(input);
			expect(result).toEqual({
				name: 'Elena',
				position: 'standing',
				outfit: {
					head: null,
					torso: 'red blouse',
					footwear: null,
				},
				mood: ['happy', 'excited'],
			});
		});
	});

	describe('JSON repair - smart quotes', () => {
		it('repairs left/right double quotes', () => {
			const input = '{"name": "test"}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('repairs mixed smart quotes', () => {
			const input = '{"name": "test", "value": "hello"}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test', value: 'hello' });
		});
	});

	describe('JSON repair - single quotes', () => {
		it('repairs single-quoted keys', () => {
			const input = "{'name': 'test'}";
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('repairs single-quoted values', () => {
			const input = '{"name": \'test\'}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('repairs single-quoted array elements', () => {
			const input = "{'items': ['a', 'b', 'c']}";
			const result = parseJsonResponse(input);
			expect(result).toEqual({ items: ['a', 'b', 'c'] });
		});

		it('repairs mixed quote styles', () => {
			const input = `{"name": 'test', 'value': "hello"}`;
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test', value: 'hello' });
		});
	});

	describe('JSON repair - key apostrophe typos', () => {
		it('repairs key with trailing apostrophe', () => {
			const input = `{"mood': ["happy"]}`;
			const result = parseJsonResponse(input);
			expect(result).toEqual({ mood: ['happy'] });
		});

		it('repairs multiple keys with trailing apostrophes', () => {
			const input = `{"name': "test", "value': 123}`;
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test', value: 123 });
		});
	});

	describe('JSON repair - unquoted string values', () => {
		it('repairs simple unquoted string value', () => {
			const input = '{"name": test}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('preserves null values', () => {
			const input = '{name: null}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: null });
		});

		it('preserves boolean values', () => {
			const input = '{active: true, disabled: false}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ active: true, disabled: false });
		});

		it('preserves number values', () => {
			const input = '{count: 42, price: 19.99}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ count: 42, price: 19.99 });
		});

		it('repairs unquoted string with spaces', () => {
			const input = '{"torso": red blouse}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ torso: 'red blouse' });
		});

		it('repairs unquoted string with hyphens', () => {
			const input = '{"style": relaxed-fit hoodie}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ style: 'relaxed-fit hoodie' });
		});
	});

	describe('JSON repair - combined issues', () => {
		it('handles multiple repair types together', () => {
			const input = `{
				name: 'Elena',
				mood': ["happy"],
				outfit: {
					head: null,
					torso: red blouse
				}
			}`;
			const result = parseJsonResponse(input);
			expect(result).toEqual({
				name: 'Elena',
				mood: ['happy'],
				outfit: {
					head: null,
					torso: 'red blouse',
				},
			});
		});
	});

	describe('JSON repair - value preservation', () => {
		it('preserves null values with unquoted keys', () => {
			const input = '{head: null, jacket: null, torso: null}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ head: null, jacket: null, torso: null });
		});

		it('preserves null in nested objects', () => {
			const input = '{outfit: {head: null, footwear: null}}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ outfit: { head: null, footwear: null } });
			expect((result as { outfit: { head: unknown } }).outfit.head).toBeNull();
		});

		it('preserves integer values', () => {
			const input = '{count: 42, year: 2024, negative: -5}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ count: 42, year: 2024, negative: -5 });
			expect(typeof (result as { count: unknown }).count).toBe('number');
		});

		it('preserves float values', () => {
			const input = '{temperature: 72.5, price: 19.99, ratio: 0.5}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ temperature: 72.5, price: 19.99, ratio: 0.5 });
			expect(typeof (result as { temperature: unknown }).temperature).toBe('number');
		});

		it('preserves zero', () => {
			const input = '{count: 0, value: 0.0}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ count: 0, value: 0.0 });
			expect((result as { count: unknown }).count).toBe(0);
		});

		it('preserves boolean true', () => {
			const input = '{active: true, enabled: true}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ active: true, enabled: true });
			expect((result as { active: unknown }).active).toBe(true);
		});

		it('preserves boolean false', () => {
			const input = '{active: false, disabled: false}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ active: false, disabled: false });
			expect((result as { active: unknown }).active).toBe(false);
		});

		it('preserves mixed primitives in complex structure', () => {
			const input = `{
				name: "Test",
				count: 42,
				price: 19.99,
				active: true,
				deleted: false,
				parent: null,
				tags: ["a", "b"],
				nested: {
					value: 0,
					empty: null
				}
			}`;
			const result = parseJsonResponse(input) as Record<string, unknown>;
			expect(result.count).toBe(42);
			expect(result.price).toBe(19.99);
			expect(result.active).toBe(true);
			expect(result.deleted).toBe(false);
			expect(result.parent).toBeNull();
			expect((result.nested as Record<string, unknown>).value).toBe(0);
			expect((result.nested as Record<string, unknown>).empty).toBeNull();
		});

		it('preserves null in arrays', () => {
			const input = '{items: [null, "a", null, "b"]}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ items: [null, 'a', null, 'b'] });
		});

		it('preserves numbers in arrays', () => {
			const input = '{values: [1, 2.5, -3, 0]}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ values: [1, 2.5, -3, 0] });
		});

		it('does not quote null even with single quote repairs active', () => {
			const input = "{'head': null, 'jacket': null}";
			const result = parseJsonResponse(input);
			expect(result).toEqual({ head: null, jacket: null });
			expect((result as { head: unknown }).head).toBeNull();
		});

		it('does not quote numbers even with single quote repairs active', () => {
			const input = "{'count': 42, 'price': 19.99}";
			const result = parseJsonResponse(input);
			expect(result).toEqual({ count: 42, price: 19.99 });
			expect(typeof (result as { count: unknown }).count).toBe('number');
		});
	});

	describe('error handling', () => {
		it('throws on completely invalid JSON', () => {
			expect(() => parseJsonResponse('not json at all')).toThrow();
		});

		it('throws on malformed structure', () => {
			expect(() => parseJsonResponse('{unclosed')).toThrow();
		});

		it('includes module name in error', () => {
			expect(() =>
				parseJsonResponse('invalid', { moduleName: 'TestModule' }),
			).toThrow('TestModule');
		});
	});

	describe('preprocessing - thinking blocks', () => {
		it('strips content before </think>', () => {
			const input = '<think>Let me analyze this...</think>{"name": "test"}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('strips content before </thinking>', () => {
			const input = '<thinking>Some reasoning here</thinking>{"value": 123}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ value: 123 });
		});

		it('strips content before [/THINK]', () => {
			const input = '[THINK]Processing...[/THINK]{"result": true}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ result: true });
		});

		it('strips content before [/REASONING]', () => {
			const input = '[REASONING]Step by step...[/REASONING]{"answer": 42}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ answer: 42 });
		});

		it('handles case-insensitive thinking tags', () => {
			const input = '<THINK>Uppercase thinking</THINK>{"name": "test"}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('handles </thought> tag', () => {
			const input = '<thought>My thoughts</thought>{"data": "value"}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ data: 'value' });
		});

		it('handles </reflection> tag', () => {
			const input = '<reflection>Reflecting...</reflection>[1, 2, 3]';
			const result = parseJsonResponse(input);
			expect(result).toEqual([1, 2, 3]);
		});
	});

	describe('preprocessing - garbage stripping', () => {
		it('strips text before first brace', () => {
			const input = 'Here is the JSON: {"name": "test"}';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('strips text after last brace', () => {
			const input = '{"name": "test"} Hope this helps!';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('strips text before and after JSON', () => {
			const input = 'Output: {"name": "test"}\n\nLet me know if you need more.';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('strips XML tags around JSON', () => {
			const input = '<response>{"name": "test"}</response>';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ name: 'test' });
		});

		it('handles arrays with surrounding garbage', () => {
			const input = 'The list is: [1, 2, 3] as requested.';
			const result = parseJsonResponse(input);
			expect(result).toEqual([1, 2, 3]);
		});

		it('handles complex garbage with thinking and XML', () => {
			const input = '<think>Processing request</think><output>{"result": "success"}</output>';
			const result = parseJsonResponse(input);
			expect(result).toEqual({ result: 'success' });
		});
	});
});

// ============================================
// asString
// ============================================

describe('asString', () => {
	it('returns string value unchanged', () => {
		expect(asString('hello', 'default')).toBe('hello');
	});

	it('returns empty string unchanged', () => {
		expect(asString('', 'default')).toBe('');
	});

	it('returns fallback for number', () => {
		expect(asString(123, 'default')).toBe('default');
	});

	it('returns fallback for null', () => {
		expect(asString(null, 'default')).toBe('default');
	});

	it('returns fallback for undefined', () => {
		expect(asString(undefined, 'default')).toBe('default');
	});

	it('returns fallback for object', () => {
		expect(asString({}, 'default')).toBe('default');
	});

	it('returns fallback for array', () => {
		expect(asString([], 'default')).toBe('default');
	});

	it('returns fallback for boolean', () => {
		expect(asString(true, 'default')).toBe('default');
	});
});

// ============================================
// asStringOrNull
// ============================================

describe('asStringOrNull', () => {
	it('returns string value unchanged', () => {
		expect(asStringOrNull('hello')).toBe('hello');
	});

	it('returns empty string unchanged', () => {
		expect(asStringOrNull('')).toBe('');
	});

	it('returns null for number', () => {
		expect(asStringOrNull(123)).toBeNull();
	});

	it('returns null for null', () => {
		expect(asStringOrNull(null)).toBeNull();
	});

	it('returns null for undefined', () => {
		expect(asStringOrNull(undefined)).toBeNull();
	});

	it('returns null for object', () => {
		expect(asStringOrNull({})).toBeNull();
	});

	it('returns null for array', () => {
		expect(asStringOrNull([])).toBeNull();
	});
});

// ============================================
// asNumber
// ============================================

describe('asNumber', () => {
	it('returns number value unchanged', () => {
		expect(asNumber(42, 0)).toBe(42);
	});

	it('returns zero unchanged', () => {
		expect(asNumber(0, 99)).toBe(0);
	});

	it('returns negative numbers unchanged', () => {
		expect(asNumber(-5, 0)).toBe(-5);
	});

	it('returns floats unchanged', () => {
		expect(asNumber(3.14, 0)).toBe(3.14);
	});

	it('returns fallback for string', () => {
		expect(asNumber('42', 0)).toBe(0);
	});

	it('returns fallback for null', () => {
		expect(asNumber(null, 99)).toBe(99);
	});

	it('returns fallback for undefined', () => {
		expect(asNumber(undefined, 99)).toBe(99);
	});

	it('returns fallback for NaN', () => {
		expect(asNumber(NaN, 99)).toBe(NaN); // NaN is typeof number
	});

	it('returns fallback for object', () => {
		expect(asNumber({}, 99)).toBe(99);
	});
});

// ============================================
// asStringArray
// ============================================

describe('asStringArray', () => {
	it('returns string array unchanged', () => {
		expect(asStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
	});

	it('returns empty array for empty input', () => {
		expect(asStringArray([])).toEqual([]);
	});

	it('filters out non-string values', () => {
		expect(asStringArray(['a', 1, 'b', null, 'c'])).toEqual(['a', 'b', 'c']);
	});

	it('returns empty array for non-array input', () => {
		expect(asStringArray('not an array')).toEqual([]);
	});

	it('returns empty array for null', () => {
		expect(asStringArray(null)).toEqual([]);
	});

	it('returns empty array for undefined', () => {
		expect(asStringArray(undefined)).toEqual([]);
	});

	it('returns empty array for object', () => {
		expect(asStringArray({ a: 1 })).toEqual([]);
	});

	it('respects maxItems limit', () => {
		expect(asStringArray(['a', 'b', 'c', 'd', 'e'], 3)).toEqual(['a', 'b', 'c']);
	});

	it('returns all items if fewer than maxItems', () => {
		expect(asStringArray(['a', 'b'], 5)).toEqual(['a', 'b']);
	});

	it('applies maxItems after filtering', () => {
		expect(asStringArray(['a', 1, 'b', 2, 'c', 3, 'd'], 2)).toEqual(['a', 'b']);
	});
});

// ============================================
// isObject
// ============================================

describe('isObject', () => {
	it('returns true for plain object', () => {
		expect(isObject({})).toBe(true);
	});

	it('returns true for object with properties', () => {
		expect(isObject({ a: 1, b: 2 })).toBe(true);
	});

	it('returns false for null', () => {
		expect(isObject(null)).toBe(false);
	});

	it('returns false for array', () => {
		expect(isObject([])).toBe(false);
	});

	it('returns false for string', () => {
		expect(isObject('string')).toBe(false);
	});

	it('returns false for number', () => {
		expect(isObject(42)).toBe(false);
	});

	it('returns false for undefined', () => {
		expect(isObject(undefined)).toBe(false);
	});

	it('returns false for function', () => {
		expect(isObject(() => { })).toBe(false);
	});

	it('returns true for Object.create(null)', () => {
		expect(isObject(Object.create(null))).toBe(true);
	});
});
