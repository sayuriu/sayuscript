import { Keywords } from "./keywords";
import { Token, TokenKind } from "./tokens";
import { Nullable } from "./util";

export class ParserError extends Error {
    constructor(message: string, public line: number, public startPos: number, public endPos: number) {
        super(message);
    }
}

export class DeclarationStatement { constructor(public ident: any, public value: any) {} }
export class Program { constructor(public body: any[]) {} }
export class Identifier { constructor(public name: string) {} }
export class Literal { constructor(public type: TokenKind, public value: string) {} }

export abstract class ASTParserBase {
    /* The current cursor position. */
    protected cursor = 0;
    /* The current token that is being visited. */
    protected currentToken: Token;
    /* The last token that was visited. */
    protected lastToken: Token;
    /* The token stream. */
    protected abstract tokens: Token[];

    /** Gets the next token and advances the cursor. */
    advance() {
        this.lastToken = this.currentToken;
        return this.currentToken = this.tokens[++this.cursor];
    }

    /** Retreats the cursor and gets the previous token. */
    retreat() {
        this.lastToken = this.currentToken;
        return this.currentToken = this.tokens[--this.cursor];
    }

    /** Checks if the cursor has reached the end of the token stream. */
    eof() {
        return this.currentToken.type === TokenKind.Eof;
    }

    /** Looks ahead in the stream. */
    lookAhead(offset = 1) {
        return this.tokens[this.cursor + offset];
    }

    /** Looks behind in the stream. */
    lookBehind(offset = 1) {
        return this.tokens[this.cursor - offset];
    }

    /** Looks at the current token. */
    currentlyIs(...types: Array<TokenKind | Keywords | Array<TokenKind | Keywords>>): boolean {
        return types.flat().includes(this.currentToken.type);
    }

    /**
     * Grabs the current token and perform a type check against `types`.
     *
     * Returns the token and advances the cursor if it matches, and throws an error otherwise.
     * */
    expect(...types: Array<TokenKind | Keywords | Array<TokenKind | Keywords>>): Token {
        const expected = types.flat();
        const token = this.currentToken;
        if (!expected.includes(token.type)) {
            throw new ParserError(
                `Expected ${expected.length < 2 ? '' : 'any of'} ${expected.map(t => `\`${TokenKind[t]}\``)} but got ${TokenKind[token.type]}`,
                token.line,
                token.startPos,
                token.endPos
            );
        }
        this.advance();
        return token;
    }

    /**
     * Grabs the current token and perform a type check against `types`.
     *
     * Advances the cursor and return the consumed token if it matches, and returns false otherwise.
     * */
    consume(...types: Array<TokenKind | Keywords | Array<TokenKind | Keywords>>): Nullable<Token> {
        const token = this.currentToken;
        if (types.flat().includes(this.currentToken.type)) {
            this.advance();
            return token;
        }
        return null;
    }

    abstract parse(): unknown;
}