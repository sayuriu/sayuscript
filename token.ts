import { Keywords } from "./keywords.ts";
import type { Nullable } from "./util.ts";

export enum TokenKind {
    StrLiteral    , // "sayuri"
    RawStrLiteral , // r"sayuri"
    CharLiteral   , // 'a'
    IntLiteral    , // 123, 123_456, 123, 0b1010, 0o123,
    FloatLiteral  , // 1.23, 1.23e10, 1.23e-10
    Ident         , // sayu
    Quote         , // '
    DoubleQuote   , // "
    BackQuote     , // `
    OpenParen     , // (
    CloseParen    , // )
    OpenBrace     , // {
    CloseBrace    , // }
    OpenBracket   , // [
    RBracket      , // ]
    Semi          , // ;
    Comma         , // ,
    Dot           , // .
    Colon         , // :
    Eq            , // =
    Plus          , // +
    Minus         , // -
    Star          , // *
    Slash         , // /
    Percent       , // %
    Bang          , // !
    Lt            , // <
    LtLt          , // <<
	Le 		  	  , // <=
    Gt            , // >
    GtGt          , // >>
	Ge 			  , // >=
	EqEq 		  , // ==
	BangEq 		  , // !=
    And           , // &
	AndAnd 		  , // &&
    Or            , // |
	OrOr 		  , // ||
    Caret         , // ^
    Tilde         , // ~
    Question      , // ?
    At            , // @
    Eof           , // End of file
}

export const specialChars = {
    "'": TokenKind.Quote,
    '"': TokenKind.DoubleQuote,
    '`': TokenKind.BackQuote,
    '(': TokenKind.OpenParen,
    ')': TokenKind.CloseParen,
    '{': TokenKind.OpenBrace,
    '}': TokenKind.CloseBrace,
    '[': TokenKind.OpenBracket,
    ']': TokenKind.RBracket,
    ';': TokenKind.Semi,
    ',': TokenKind.Comma,
    '.': TokenKind.Dot,
    ':': TokenKind.Colon,
    '=': TokenKind.Eq,
    '+': TokenKind.Plus,
    '-': TokenKind.Minus,
    '*': TokenKind.Star,
    '/': TokenKind.Slash,
    '%': TokenKind.Percent,
    '!': TokenKind.Bang,
    '<': TokenKind.Lt,
    '>': TokenKind.Gt,
    '&': TokenKind.And,
    '|': TokenKind.Or,
    '^': TokenKind.Caret,
    '~': TokenKind.Tilde,
    '?': TokenKind.Question,
    '@': TokenKind.At,
}

export enum NumberLiteralKind {
    Decimal = 'Dec',
    Hex = 'Hex',
    Octal = 'Oct',
    Binary = 'Bin',
}

/** A generic token class that can be used to represent any token. */
export class Token {
	constructor(
		/** The type of the token. */
		public readonly type: TokenKind,
		/** Raw content of the token. */
		public readonly value: string,
		/**
		 * The lines where the token is located.
		 *
		 * Stored as a tuple of `[startLine, endLine], inclusive`.
		 * */
		public readonly lineSpan: [number, number],
		/**
		 * The position where the token starts and ends.
		 *
		 * If the token spans more than one line, then the end position
		 * is assumed to be the last character of the last line.
		 */
		public readonly positionSpan: [number, number],
	) {}

	/** Returns a string representation of the token. */
	toString() {
		return `${TokenKind[this.type]}${this.value ? `(${this.value})` : ''}`;
	}

	/** Returns the full string representation of the token. */
	fullString() {
		const [startLine, endLine] = this.lineSpan;
		const [startPos, endPos] = this.positionSpan;
		return this.toString()
			+ ` at ${startLine}:${startPos} -> ${endLine}:${endPos}`;
	}
}

/** Represents a number token. */
export class NumberToken extends Token {
	constructor(
		type: TokenKind,
		/** The mode of the number token. */
		public readonly mode: NumberLiteralKind,
		value: string,
		lineNumber: number,
		positionSpan: [number, number],
	) {
		super(type, value, [lineNumber, lineNumber], positionSpan);
	}

	override toString() {
		return `${TokenKind[this.type]}(${this.mode})${this.value ? `(${this.value})` : ''}`;
	}
}

/** Represents an identifier. */
export class Identifier extends Token {
	constructor(
		public readonly name: string,
		type: TokenKind,
		value: string,
		lineSpan: [number, number],
		positionSpan: [number, number],
	) {
		super(type, value, lineSpan, positionSpan);
	}

	override toString() {
		if (this.isKeyword())
		{
			return `${Keywords[this.value]}Keyword`;
		}
		return `${TokenKind[this.type]}(${this.name})${this.value ? `(${this.value})` : ''}`;
	}

	/** Checks if the token is a keyword. */
	isKeyword() {
		return this.value in Keywords;
	}

	/** Tries resolving the keyword of the token.
	 * Returns `null` if the token is not a keyword.
	*/
	tryResolveKeyword(): Nullable<string> {
		return Keywords[this.value] ?? null;
	}
}