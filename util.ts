export type Nullable<T> = T | null;

export const isSpecialChar = (c: Nullable<string>) => c && c.match(/[`@"'\(\)\{\}\[\];,\.:\=\+\-\*\/\%\!\<\>\&\|\^\~\?]/)
export const isWhitespace = (c: Nullable<string>) => c && c.match(/\s/)
export const isDigit = (c: Nullable<string>) => c && c.match(/\d/)
export const isAlpha = (c: Nullable<string>) => c && c.match(/[a-zA-Z_]/)
export const isAlphaNumeric = (c: Nullable<string>) => c && c.match(/[a-zA-Z0-9_]/)

export const todo = (msg: string) => {
	throw new Error(`TODO: ${msg}`);
};

export const tryFn = <T>(fn: () => T): Nullable<T> => {
	try {
		return fn();
	} catch {
		return null;
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