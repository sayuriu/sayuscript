import { BidirectionalMap, escapeSpecialChar, NODE_INSPECT_SYMBOL, type CharSpan } from "./util.ts";

export enum CommentKind {
    Line,
    LineDoc,
    Block,
}

export enum TokenKind {
    /** Represents any contiguous whitespace sequence. */
    Whitespace,
    /** Represents a line comment. */
    LineComment,
    /** Represents a block comment. */
    BlockComment,
    /** Represents a string literal, such as `"sayuri"`. */
    StrLiteral,
    /** Represents a raw string literal, such as `r"sayuri"`.
     *
     * Raw string literals do not need escaping.
     */
    RawStrLiteral,
    /** Represents a character literal, such as `'a'`. */
    CharLiteral,
    /** Represents an integer literal.
     *
     * - Normal: `123`
     * - Hexadecimal: `0x1310`
     * - Binary: `0b1010`
     * - Octal: `0o123`
     *
     * Integers can have delimiters (underscores) between them, such as `123_456`.
     * */
    IntLiteral,
    /** Represents float literal, such as `1.23, 1.23e10, 1.23e-10`. */
    FloatLiteral,
    /** Represents an identifier. */
    Ident,
    /** Represents a single quote (`'`). */
    Quote,
    /** Represents a double quote (`"`). */
    DoubleQuote,
    /** Represents a quote in backticks (`` ` ``). */
    BackQuote,
    /** Represents an opening parenthesis (`(`). */
    LParen,
    /** Represents a closing parenthesis (`)`). */
    RParen,
    /** Represents an opening brace (`{`). */
    LBrace,
    /** Represents a closing brace (`}`). */
    RBrace,
    /** Represents an opening bracket (`[`). */
    LBracket,
    /** Represents a closing bracket (`]`). */
    RBracket,
    /** Represents a semicolon (`;`). */
    Semi,
    /** Represents a comma (`,`). */
    Comma,
    /** Represents a dot (`.`). */
    Dot,
    /** Represents a colon (`:`). */
    Colon,
    /** Represents a double colon (`::`). */
    ColonColon,
    /** Represents an equal sign (`=`). */
    Eq,
    /** Represents a plus (`+`). */
    Plus,
    /** Represents a minus (`-`). */
    Minus,
    /** Represents an asterisk (`*`). */
    Star,
    /** Represents a slash (`/`). */
    Slash,
    /** Represents a percentage sign (`%`). */
    Percent,
    /** Represents an exclamation mark (bang) (`!`). */
    Bang,
    /** Represents a "less than" sign (`<`). */
    Lt,
    /** Represents a double "less than" sign (`<<`). */
    LtLt,
	/** Represents a "less or equal" sign (`<=`). */
	Le,
    /** Represents a "greater than" sign (`>`). */
    Gt,
    /** Represents a double "greater than" sign (`>>`). */
    GtGt,
	/** Represents a "greater or equal" sign (`>=`). */
	Ge,
	/** Represents a double equal sign (`==`). */
	EqEq,
	/** Represents a "bang equal" sign (`!=`). */
	BangEq,
    /** Represents an ambersand (`&`). */
    And,
	/** Represents a double ambersand (`&&`). */
	AndAnd,
    /** Represents a vertical slash (`|`). */
    Or,
	/** Represents a doubel vertical slash (`||`). */
	OrOr,
    /** Represents an arrow (`->`). */
    Arrow,
    /** Represents a caret (`^`). */
    Caret,
    /** Represents a tilde (`~`). */
    Tilde,
    /** Represents a question mark (`?`). */
    Question,
    /** Represents an at symbol (`@`). */
    At,
    /** End of File. */
    Eof
}

export const specialChars = {
    "'": TokenKind.Quote,
    '"': TokenKind.DoubleQuote,
    '`': TokenKind.BackQuote,
    '(': TokenKind.LParen,
    ')': TokenKind.RParen,
    '{': TokenKind.LBrace,
    '}': TokenKind.RBrace,
    '[': TokenKind.LBracket,
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

export const specialCharsMapping = new BidirectionalMap(
    [
        ...Object.entries(specialChars),
        ['<<', TokenKind.LtLt],
        ['>>', TokenKind.GtGt],
        ['<=', TokenKind.Le],
        ['>=', TokenKind.Ge],
        ['==', TokenKind.EqEq],
        ['!=', TokenKind.BangEq],
        ['&&', TokenKind.AndAnd],
        ['||', TokenKind.OrOr],
    ]
)

export enum NumberLiteralKind {
    Decimal,
    Hex,
    Octal,
    Binary,
}


export const LiteralTokenTypes = [
    TokenKind.IntLiteral,
    TokenKind.CharLiteral,
    TokenKind.FloatLiteral,
    TokenKind.StrLiteral,
    TokenKind.RawStrLiteral,
]

/** A generic token class that can be used to represent any token. */
export class Token {
	constructor(
		/** The type of the token. */
		public readonly type: TokenKind,
		/** Raw content of the token. */
		public readonly content: string,
        /**
         * The span of the token in the source code.
         *
         * It is represented as `[start, end)`.
         */
        public readonly span: CharSpan,
        /** The token's order in the token stream. */
        public readonly tokenPos: number
	) {}

	/** Returns a string representation of the token. */
	toString() {
		return `${TokenKind[this.type]}${this.content ? ` '${escapeSpecialChar(this.content)}'` : ''}`;
	}

	/** Returns the full string representation of the token. */
	fullString() {
		return `[${this.span[0]} -> ${this.span[1]}) ${this.toString()}`;
	}

    [NODE_INSPECT_SYMBOL]() {
        const [start, end] = this.span;
        return `Token(${this.tokenPos}) { type: ${TokenKind[this.type]}, charSpan: [${start} -> ${end})${this.content ? `, content: '${escapeSpecialChar(this.content)}'` : ''} }`;
    }
}

/** Represents a number token. */
export class NumberToken extends Token {
	constructor(
		type: TokenKind,
		/** The mode of the number token. */
		public readonly mode: NumberLiteralKind,
		value: string,
        span: CharSpan,
        tokenPos: number
	) {
		super(type, value, span, tokenPos);
	}

	override toString() {
		return `${TokenKind[this.type]}(${this.mode})${this.content ? ` '${this.content}'` : ''}`;
	}

    [Symbol.for("nodejs.util.inspect.custom")]() {
        const [start, end] = this.span;
        return `Token(${this.tokenPos}) { type: ${TokenKind[this.type]}:${NumberLiteralKind[this.mode]}, charSpan: [${start} -> ${end})${this.content ? `', content: ${escapeSpecialChar(this.content)}'` : ''} }`;
    }
}
