import { Token, TokenKind } from "./token.ts";
import { Nullable, Span } from "./util.ts";

export class ParserError extends Error {
    constructor(message: string, public startPos: number, public endPos: number) {
        super(message);
    }
}

export enum Restriction {
    None,
    Statement,
    Expression,
    Import,
    ImportMultiple,
}

export abstract class Parser {
    /** The current cursor position in the token stream. */
    protected cursor = 0;
    private readonly EOF = new Token(TokenKind.Eof, "", [0, 0], 0);
    /** Whether the parser encountered errors while parsing. */
    protected enounteredErrors = false;
    protected accumulatedErrors: ParserError[] = [];
    /** The token that is currently being visited. */
    get currentToken() {
        return this.tokens[this.cursor] ?? this.EOF;
    }
    /* The token stream. */
    protected abstract tokens: Token[];

    /** Gets the next token and advances the cursor. */
    advance() {
        ++this.cursor;
        return this.currentToken;
    }

    /** Gets the previous token and retreats the cursor. */
    retreat() {
        --this.cursor;
        return this.currentToken;
    }

    /** Checks if the cursor has reached the end of the token stream. */
    eof() {
        return this.cursor >= this.tokens.length - 1;
    }

    /** Looks ahead in the stream. */
    lookAhead(offset = 1) {
        return this.tokens[this.cursor + offset];
    }

    /** Looks behind in the stream. */
    lookBehind(offset = 1) {
        return this.tokens[this.cursor - offset];
    }

    /** Performs a type check against the current token.
     * The token is not consumed regardless of the outcome.
    */
    currentlyIs(...types: Array<TokenKind | Array<TokenKind>>): boolean {
        return types.flat().includes(this.currentToken?.type ?? TokenKind.Eof);
    }

    /**
     * Grabs the current token and performs a type check against `types`.
     *
     * Returns the token and advances the cursor if it matches, and throws an error otherwise.
     * */
    expect<T extends TokenKind>(type: T): Token & { type: T };
    expect<T extends TokenKind>(...types: (T | T[])[]): Token & { type: T[][number] };
    expect(...types: Array<TokenKind | Array<TokenKind>>): Token {
        const expected = types.flat();
        const token = this.currentToken;
        if (!expected.includes(token.type)) {
            throw this.constructError(
                `Expected ${expected.length < 2 ? '' : 'any of'} ${expected.map(t => `\`${TokenKind[t as number]}\``)} but got ${TokenKind[token.type]}`,
                token.span,
            );
        }
        this.advance();
        return token;
    }

    /**
     * Grabs the current token and performs a type check against `types`.
     *
     * Advances the cursor and returns the consumed token if it matches, and returns `null` otherwise.
     * */
    consume<T extends TokenKind>(type: T): Nullable<Token & { type: T }>;
    consume<T extends TokenKind>(...types: (T | T[])[]): Nullable<Token & { type: T[][number] }>;
    consume(...types: Array<TokenKind | Array<TokenKind>>): Nullable<Token> {
        const token = this.currentToken;
        if (types.flat().includes(this.currentToken.type)) {
            this.advance();
            return token;
        }
        return null;
    }

    constructError(message: string, span: Span) {
        this.enounteredErrors = true;
        const error = new ParserError(message, span[0], span[1]);
        this.report(message, span);
        this.accumulatedErrors.push(error);
        return error;
    }

    report(message: string, span: Span) {
        console.log(`${span[0]}-${span[1]}: ${message}`);
    }

    /** Parses the token stream and returns the root node of the AST. */
    abstract parse(): unknown;
    /** Attempts a recovery from a parsing error. */
    abstract recover(): void;
}