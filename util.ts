export type Nullable<T> = T | null;
/** Represents a span of tokens/characters in a source file.
 *
 * It is represented as `[start, end)`.
*/
export type Span = readonly [number, number];
/** Represents a span of tokens in a source file, exclusive. */
export type TokenSpan = Span;
/** Represents a span of characters in a source file, exclusive. */
export type CharSpan = Span;

export const isSpecialChar = (c: Nullable<string>) => c && c.match(/[`@"'\(\)\{\}\[\];,\.:\=\+\-\*\/\%\!\<\>\&\|\^\~\?]/);
export const isWhitespace = (c: Nullable<string>) => c && c.match(/\s/);
export const isDigit = (c: Nullable<string>) => c && c.match(/\d/);
export const isHexDigit = (c: Nullable<string>) => c && c.match(/[0-9a-fA-F]/);
export const isAlpha = (c: Nullable<string>) => c && c.match(/[a-zA-Z_]/);
export const isAlphaNumeric = (c: Nullable<string>) => c && c.match(/[a-zA-Z0-9_]/);

const specialCharEscapeMap: Record<string, string> = {
    '\n': '\\n',
    '\r': '\\r',
    '\t': '\\t',
    '\v': '\\v',
    '\b': '\\b',
    '\f': '\\f',
};

export const escapeSpecialChar = (c: string) => c.replaceAll(
    /[\n\r\t\v\b\f]/g,
    (match) => specialCharEscapeMap[match] ?? match
)

export const todo = (msg: string) => {
	throw new Error(`TODO: ${msg}`);
};

/** Makes a function return `null` instead if it throws an error. */
// deno-lint-ignore no-explicit-any
export function tryWrapper<F extends (...args: any) => any>(fn: F):
    (...args: Parameters<F>) => Nullable<ReturnType<F>>
    {
		return (...args) => {
            try {
                return fn(...args);
            } catch {
                return null;
            }
        }
    }

export class BidirectionalMap<K, V> {
	private readonly map: Map<K, V> = new Map();
	private readonly reverseMap: Map<V, K> = new Map();

	constructor(entries: [K, V][]) {
		for (const [k, v] of entries) {
			this.map.set(k, v);
			this.reverseMap.set(v, k);
		}
	}

	get(key: K): V | undefined {
		return this.map.get(key);
	}

	getReverse(value: V): K | undefined {
		return this.reverseMap.get(value);
	}

	has(key: K): boolean {
		return this.map.has(key);
	}

	hasReverse(value: V): boolean {
		return this.reverseMap.has(value);
	}

	entries(): IterableIterator<[K, V]> {
		return this.map.entries();
	}

	reverseEntries(): IterableIterator<[V, K]> {
		return this.reverseMap.entries();
	}

	forEach(callback: (value: V, key: K) => void) {
		this.map.forEach(callback);
	}

	reverseForEach(callback: (key: K, value: V) => void) {
		this.reverseMap.forEach(callback);
	}

	delete(key: K) {
		const value = this.map.get(key);
		if (value === undefined) return;
		this.map.delete(key);
		this.reverseMap.delete(value);
	}

	deleteReverse(value: V) {
		const key = this.reverseMap.get(value);
		if (key === undefined) return;
		this.reverseMap.delete(value);
		this.map.delete(key);
	}

	clear() {
		this.map.clear();
		this.reverseMap.clear();
	}

	set(key: K, value: V) {
		this.map.set(key, value);
		this.reverseMap.set(value, key);
	}
}

export const NODE_INSPECT_SYMBOL = Symbol.for("nodejs.util.inspect.custom");