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
    LParen        , // (
    RParen        , // )
    LBrace        , // {
    RBrace        , // }
    LBracket      , // [
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
    Arrow         , // ->
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

export enum NumberLiteralKind {
    Decimal = 'Dec',
    Hex = 'Hex',
    Octal = 'Oct',
    Binary = 'Bin',
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
        public readonly span: readonly [number, number],
        /** The token's order in the token stream. */
        public readonly tokenPos: number
	) {}

	/** Returns a string representation of the token. */
	toString() {
		return `${TokenKind[this.type]}${this.content ? ` ${this.content}` : ''}`;
	}

	/** Returns the full string representation of the token. */
	fullString() {
		return `${this.toString()} [${this.span[0]} -> ${this.span[1]})`;
	}
}

/** Represents a number token. */
export class NumberToken extends Token {
	constructor(
		type: TokenKind,
		/** The mode of the number token. */
		public readonly mode: NumberLiteralKind,
		value: string,
        span: readonly [number, number],
        tokenPos: number
	) {
		super(type, value, span, tokenPos);
	}

	override toString() {
		return `${TokenKind[this.type]}(${this.mode})${this.content ? `(${this.content})` : ''}`;
	}
}
