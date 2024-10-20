export type Nullable<T> = T | null;

export const isSpecialChar = (c: Nullable<string>) => c && c.match(/[`@"'\(\)\{\}\[\];,\.:\=\+\-\*\/\%\!\<\>\&\|\^\~\?]/)
export const isWhitespace = (c: Nullable<string>) => c && c.match(/\s/)
export const isDigit = (c: Nullable<string>) => c && c.match(/\d/)
export const isAlpha = (c: Nullable<string>) => c && c.match(/[a-zA-Z_]/)
export const isAlphaNumeric = (c: Nullable<string>) => c && c.match(/[a-zA-Z0-9_]/)

export const todo = (msg: string) => {
	throw new Error(`TODO: ${msg}`);
};
