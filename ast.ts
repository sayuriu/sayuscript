import { Keywords } from "./keywords.ts";
import { Token, TokenKind } from "./tokens.ts";
import { Nullable } from "./util.ts";

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
    protected cursor = 0;
    protected currentToken: Token;
    protected lastToken: Token;
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

    eof() {
        return this.currentToken.type === TokenKind.Eof;
    }

    lookAhead(offset = 1) {
        return this.tokens[this.cursor + offset];
    }

    lookBehind(offset = 1) {
        return this.tokens[this.cursor - offset];
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
                `Expected ${expected.length < 2 ? `\`${expected[0]}\`` : `any of ${expected.map(t => `\`${t}\``)}`} but got ${token.type}`,
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