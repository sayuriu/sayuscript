import { TokenKind, specialChars, NumberLiteralKind, NumberToken, Token } from "./token.ts";
import { Nullable, isWhitespace, isSpecialChar, isDigit, isAlpha, isAlphaNumeric } from "./util.ts";

export class Tokenizer {
    /* The current cursor position in the source string. */
    private cursor = 0;
    private startPos = 0;
    /* The current line number in the source string. */
    private currentLine = 0;
    /* The cursor position in the current line. */
    private lineCursor = 0;
    constructor(public input: string) {}

    /* Gets the current character. */
    get currentChar() {
        return this.input[this.cursor];
    }

    /* Retreats the cursor by one position.*/
    retreat() {
        return --this.cursor;
    }

    /* Advances the cursor by one position. */
    advance() {
        this.cursor++;
        this.lineCursor++;
        return this.cursor;
    }

    /* Gets the next character. */
    nextChar() {
        if (this.eof()) return null;
        const next = this.input[this.advance()];
        if (next === '\n') {
            this.currentLine++;
            this.lineCursor = 0;
        }
        return next;
    }

    /* Looks further ahead and returns the position where the predicate first failed. */
    lookAheadUntil(predicate: (c: Nullable<string>) => boolean) {
        let pos = 1;
        while (predicate(this.lookAhead(pos))) {
            pos++;
        }
        return pos;
    }

    /* Looks ahead in the input stream. */
    lookAhead(offset = 1) {
        const newIdx = this.cursor + offset;
        if (newIdx >= this.input.length) return null;
        return this.input[newIdx];
    }

    /* Looks behind in the input stream. */
    lookBehind(offset = 1) {
        const newIdx = this.cursor - offset;
        if (newIdx < 0) return null;
        return this.input[newIdx];
    }

    /* Greedily match until the predicate fails. */
    matchUntil(predicate: (c: Nullable<string>) => boolean) {
        let buffer = '';
        while (!this.eof()) {
            const c = this.nextChar();
            if (predicate(c)) {
                this.retreat();
                break;
            }
            buffer += c;
        }
        return buffer
    }

    makeToken(kind: TokenKind, value: string) {
        const currentLine = this.currentLine;
        const startPos = this.startPos;
        return new Token(kind, value, [currentLine, currentLine], [startPos, startPos]);
    }

    nextStringLiteral(isRaw = false)
    {
        const startPos = this.cursor;
        const startLine = this.currentLine;
        let buffer = '';
        if (isRaw) {
            while (this.nextChar()) {
                const c = this.currentChar;
                if (c === '"')
                    break;

                buffer += c;
            }
        }
        else {
            while (this.nextChar()) {
                const c = this.currentChar;
                if (c === '"' || c === '\n' || c === '\r')
                    break;

                buffer += c;
            }
        }
        if (this.currentChar !== '"')
            throw new LexerError(`Unterminated ${isRaw ? 'raw ' : ''}string literal`, this.currentLine, this.lineCursor);

        this.advance();
        return new Token(
            isRaw ? TokenKind.RawStrLiteral : TokenKind.StrLiteral,
            buffer,
            [startLine, this.currentLine],
            [startPos, this.cursor],

        );
    }

    nextCharLiteral() {
        // A character literal is a single character surrounded by single quotes, such as 'a' or '5'.
        // A character literal may also be a single escape sequence, such as '\n' or '\x7F'.
        // A character literal may also be a single Unicode code point, such as '\u{1F600}'.
        const startPos = this.cursor;
        const currentLine = this.currentLine;
        let c = this.nextChar();
        let buffer = "'";
        buffer += (c ?? '');
        const isEscape = c === '\\';
        buffer += (c = this.nextChar() ?? '')
        if (isEscape) {
            if (c === 'x')
            {
                // we take 2 more
                buffer += this.nextChar() ?? '';
                buffer += this.nextChar() ?? '';
                c = this.nextChar();
            }
            else if (c === 'u') {
                c = this.nextChar() ?? '';
                if (c === '{') {
                    buffer += c;
                    while (!this.eof() && (c = this.nextChar())) {
                        if (c === '}' || c === '\n' || c === '\r')
                            break;
                        buffer += c;
                    }
                    buffer += c;
                    c = this.nextChar();
                } else {
                    let i = 0;
                    while (!this.eof() && (c = this.nextChar())) {
                        if (i++ === 3 || c === '\n' || c === '\r')
                            break;
                        buffer += c;
                    }
                }
            }
        }
        if (c !== "'") {
            throw new LexerError(`Invalid character literal`, currentLine, this.lineCursor);
        }
        this.advance();
        return new Token(TokenKind.CharLiteral, buffer, [currentLine, currentLine], [startPos, this.cursor]);
    }

    nextHexLiteral() {
        let buffer = '0x';
        const startPos = this.cursor - 2;
        while (this.nextChar()) {
            const c = this.currentChar;
            if (c.match(/[a-fA-F0-9]/)) {
                buffer += c;
            } else if (isWhitespace(c) || isSpecialChar(c)) {
                break;
            } else if (c === '_' && !buffer.endsWith('_')) {
                    buffer += c;
            } else {
                throw new LexerError(`Invalid hex literal \`${buffer + c}\``, this.currentLine, this.lineCursor);
            }
        }
        if (!isDigit(buffer[buffer.length - 1])) {
            throw new LexerError(`Invalid hex literal \`${buffer}\``, this.currentLine, this.lineCursor);
        }
        return new NumberToken(
            TokenKind.IntLiteral,
            NumberLiteralKind.Hex,
            buffer,
            this.currentLine,
            [startPos, this.cursor]
        );
    }

    nextBinaryLiteral() {
        let buffer = '0b';
        const startPos = this.cursor - 2;
        while (this.nextChar()) {
            const c = this.currentChar;
            if (c.match(/[0-1]/)) {
                buffer += c;
            } else if (isWhitespace(c) || isSpecialChar(c)) {
                break;
            } else if (c === '_' && !buffer.endsWith('_')) {
                buffer += c;
            }
            else {
                throw new LexerError(`Invalid binary literal \`${buffer + c}\``, this.currentLine, this.lineCursor);
            }
        }
        if (!isDigit(buffer[buffer.length - 1])) {
            throw new LexerError(`Invalid binary literal \`${buffer}\``, this.currentLine, this.lineCursor);
        }
        return new NumberToken(
            TokenKind.IntLiteral,
            NumberLiteralKind.Binary,
            buffer,
            this.currentLine,
            [startPos, this.cursor]
        );
    }

    nextOctalLiteral() {
        let buffer = '0o';
        const startPos = this.cursor - 2;
        while (this.nextChar()) {
            const c = this.currentChar;
            if (c.match(/[0-7]/)) {
                buffer += c;
            } else if (isWhitespace(c) || isSpecialChar(c)) {
                break;
            } else if (c === '_' && !buffer.endsWith('_')) {
                buffer += c;
            } else {
                throw new LexerError(`Invalid octal literal \`${buffer + c}\``, this.currentLine, this.lineCursor);
            }
        }
        if (!isDigit(buffer[buffer.length - 1])) {
            throw new LexerError(`Invalid octal literal \`${buffer}\``, this.currentLine, this.lineCursor);
        }
        return new NumberToken(
            TokenKind.IntLiteral,
            NumberLiteralKind.Octal,
            buffer,
            this.currentLine,
            [startPos, this.cursor]
        );
    }

    nextNumberLiteral() {
        if (this.currentChar === '0') {
            const nextChar = this.lookAhead();
            this.advance();
            if (nextChar === 'x') {
                return this.nextHexLiteral();
            }
            else if (nextChar === 'b') {
                return this.nextBinaryLiteral();
            }
            else if (nextChar === 'o') {
                return this.nextOctalLiteral();
            }
            this.retreat();
        }

        const startPos = this.cursor;
        let literalKind = TokenKind.IntLiteral;
        let buffer = this.currentChar;

        while (this.nextChar()) {
            const c = this.currentChar;
            if (c.match(/[0-9_]/)) {
                if (c === '_') {
                    if (buffer.endsWith('_')) {
                        throw new LexerError(`Invalid number literal`, this.currentLine, this.lineCursor);
                    }
                }
                buffer += c;
            }
            else if (c === '.') {
                if (literalKind === TokenKind.FloatLiteral) {
                    // Ambiguous to a spread operator
                    // ...On another thought, maybe that's for later
                    // if (buffer.endsWith('.')) {
                    //     break;
                    // }
                    throw new LexerError(`Invalid float literal \`${buffer + c}\``, this.currentLine, this.lineCursor);
                }
                literalKind = TokenKind.FloatLiteral;
                const remaining = this.matchUntil((c) => !c.match(/[0-9]/));
                buffer += c + remaining;
            }
            else if (c === 'e' || c === 'E') {
                const next = this.lookAhead() ?? '';
                if (["+", "-"].includes(next)) {
                    if (!isDigit(this.lookAhead(2))) {
                        throw new LexerError(`Invalid exponent literal \`${buffer + c + next}\``, this.currentLine, this.lineCursor);
                    }
                }
                else if (!isDigit(next)) {
                    throw new LexerError(`Invalid exponent literal \`${buffer + c + next}\``, this.currentLine, this.lineCursor);
                }
                buffer += c + next;
                this.advance();
                buffer += this.matchUntil((c) => !c.match(/[0-9]/));
                literalKind = TokenKind.FloatLiteral;
            }
            else {
                break;
            }
        }

        // check the buffer
        if (buffer.endsWith('_')) {
            throw new LexerError(`Invalid number literal`, this.currentLine, this.lineCursor);
        }
        return new NumberToken(
            literalKind,
            NumberLiteralKind.Decimal,
            buffer,
            this.currentLine,
            [startPos, this.cursor]
        );
    }

    nextIdentifier() {
        let buffer = this.currentChar;
        let c: Nullable<string>;
        while (c = this.nextChar()) {
            if (!isAlphaNumeric(c))
                break;
            buffer += c;
        }
        this.advance();
        return this.makeToken(TokenKind.Ident, buffer);
    }

    parseSpecialChar() {
        const c = this.currentChar;
        // Comments
        if (c === '/') {
            // Inline
            if (this.lookAhead() === '/') {
                while (this.nextChar()) {
                    if (this.currentChar === '\n')
                        break;
                }
                return this.nextToken();
            }
            // TODO: Add block comments, (docstring too)
            this.advance();
            return this.makeToken(TokenKind.Slash, c);
        }
        else if (c === '.') {
            const next = this.lookAhead();
            // Check if it's a float
            if (isDigit(next)) {
                return this.nextNumberLiteral();
            }
            return this.makeToken(TokenKind.Dot, c);
        }
        else if (c === '<') {
            const next = this.lookAhead();
            this.advance();
            this.advance();
            if (next === '<') {
                return this.makeToken(TokenKind.LtLt, '<<');
            } else if (next === '=') {
                return this.makeToken(TokenKind.Le, '<=');
            }
            // Doesn't match any of the above, retreat
            this.retreat();
            return this.makeToken(TokenKind.Lt, '<');
        }
        else if (c === '>') {
            const next = this.lookAhead();
            this.advance();
            this.advance();
            if (next === '>') {
                return this.makeToken(TokenKind.GtGt, '>>');
            }
            else if (next === '=') {
                return this.makeToken(TokenKind.Ge, '>=');
            }
            this.retreat();
            return this.makeToken(TokenKind.Gt, '>');
        }
        else if (c === '&') {
            const next = this.lookAhead();
            this.advance();
            if (next === '&') {
                this.advance();
                return this.makeToken(TokenKind.AndAnd, '&&');
            }
            return this.makeToken(TokenKind.And, '&');
        }
        else if (c === '|' && this.lookAhead() === '|') {
            const next = this.lookAhead();
            this.advance();
            if (next === '|') {
                this.advance();
                return this.makeToken(TokenKind.OrOr, '||');
            }
            return this.makeToken(TokenKind.Or, '|');
        }
        else if (c === '=') {
            this.advance();
            if (this.currentChar === '=') {
                this.advance();
                return this.makeToken(TokenKind.EqEq, '==');
            }
            return this.makeToken(TokenKind.Eq, c);
        }
        else if (c === '!') {
            this.advance();
            if (this.currentChar === '=') {
                this.advance();
                return this.makeToken(TokenKind.BangEq, '!=');
            }
            return this.makeToken(TokenKind.Bang, c);
        }
        else {
            this.advance();
            return this.makeToken(specialChars[c!], c);
        }
    }

    nextToken() {
        if (isWhitespace(this.currentChar))
            while (isWhitespace(this.nextChar()));

        if (this.eof())
        {
            const currentLine = this.currentLine;
            const position = this.cursor;
            return new Token(TokenKind.Eof, null, [currentLine, currentLine], [position, position]);
        }

        const currentChar = this.currentChar;

        if (currentChar === "r") {
            const next = this.lookAhead();
            if (next === '"') {
                this.advance();
                return this.nextStringLiteral(true);
            }
        }
        else if (currentChar === '"') {
            return this.nextStringLiteral();
        }
        else if (currentChar === "'") {
            return this.nextCharLiteral();
        }
        else if (isSpecialChar(currentChar)) {
            return this.parseSpecialChar();
        }
        else if (isDigit(currentChar)) {
            return this.nextNumberLiteral();
        }
        else if (isAlpha(currentChar)) {
            return this.nextIdentifier();
        }

        // Unreachable
        throw new LexerError(`Unexpected token \`${currentChar} (0x${currentChar?.charCodeAt(0).toString(16) ?? 'None'})\``, this.currentLine, this.lineCursor);
    }

    eof() {
        return this.cursor >= this.input.length;
    }
}

export class LexerError extends Error {
    constructor(message: string, public line: number, public column: number) {
        super(`${message}`);
    }

    // override toString() {
    //     return `LexerError: ${this.message} at ${this.line}:${this.column}`;
    // }
}

export function lexer(input: string): Token[] {
    const tokens: Token[] = [];
    const tokenizer = new Tokenizer(input);
    while (!tokenizer.eof()) {
        tokens.push(tokenizer.nextToken());
    }
    return [...tokens, ...(tokens[tokens.length - 1].type === TokenKind.Eof ? [] : [tokenizer.nextToken()])];
}