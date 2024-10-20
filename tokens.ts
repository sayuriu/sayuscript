import { Keywords } from "./keywords.ts";
import { Nullable } from "./util.ts";

class TokenKind2 {

}

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

export class Token {
    constructor(
        public type: TokenKind,
        public value: string = '',
        public line: number,
        public lineOffset = 0,
        public startPos: number,
        public endPos: number,
    ) {}

    toString(position = false, full = false) {
        let type = `${TokenKind[this.type]}`;
        if (this.type === TokenKind.Eof)
            return type;

        const isKeyword = this.value! in Keywords;
        if (isKeyword)
        {
            type = `${Keywords[this.value]}Keyword`;
        }
        return [
            type,
            (!full && (this.value! in specialChars) || isKeyword) ? '' : `"${this.value}"`,
            position ? (
                this.lineOffset > 0
                ? `${this.line}:${this.startPos} -> ${this.line + this.lineOffset}:${this.endPos}`
                : `${this.line}:(${this.startPos} -> ${this.endPos})`
            ) : ''
        ].join(' ').trim()
    }
}

export class NumberToken extends Token {
    constructor(
        type: TokenKind,
        value: string,
        public mode: NumberLiteralKind,
        line: number,
        startPos: number,
        endPos: number,
    ) {
        super(type, value, line, 0, startPos, endPos);
    }

    override toString(postion = false, full = false) {
        if (this.type === TokenKind.Eof) return `${this.type}`;

        let typeName = TokenKind[this.type];
        if (this.type in Keywords && full)
        {
            typeName = `${this.type}Keyword`;
        }
        return [
            typeName,
            this.type === TokenKind.IntLiteral ? `${this.mode}` : '',
            (!full && (this.value! in specialChars)) ? '' : `"${this.value}"`,
            postion ? `${this.line}:(${this.startPos} -> ${this.endPos})` : ''
        ].filter(Boolean).join(' ').trim()
    }
}