import { TokenKind, specialChars, NumberLiteralKind, NumberToken, Token } from "./token.ts";
import { Nullable, isWhitespace, isSpecialChar, isDigit, isAlpha, isAlphaNumeric } from "./util.ts";

export class Tokenizer {
    /** The current cursor position in the source string. */
    private cursor = 0;
    private startPos = 0;
    /** The current line number in the source string. */
    private currentLine = 0;
    /** The cursor position in the current line. */
    private lineCursor = 0;
    /** The current token counter. */
    private tokenCounter = 0;
    constructor(public input: string) {}

    /** Gets the current character. */
    get currentChar() {
        return this.input[this.cursor];
    }

    /** Retreats the cursor by one position. */
    retreat() {
        this.cursor--;
        this.lineCursor--;
        return this.cursor;
    }

    /** Advances the cursor by one position. */
    advance() {
        this.cursor++;
        this.lineCursor++;
        return this.cursor;
    }

    /** Gets the next character. */
    nextChar() {
        if (this.eof()) return null;
        const next = this.input[this.advance()];
        if (next === '\n') {
            this.currentLine++;
            this.lineCursor = 0;
        }
        return next;
    }

    /** Looks further ahead and returns the position where the predicate first failed. */
    lookAheadUntil(predicate: (c: Nullable<string>) => boolean) {
        let pos = 1;
        while (predicate(this.lookAhead(pos))) {
            pos++;
        }
        return pos;
    }

    /** Looks ahead in the input stream. */
    lookAhead(offset = 1) {
        const newIdx = this.cursor + offset;
        if (newIdx >= this.input.length) return null;
        return this.input[newIdx];
    }

    /** Looks behind in the input stream. */
    lookBehind(offset = 1) {
        const newIdx = this.cursor - offset;
        if (newIdx < 0) return null;
        return this.input[newIdx];
    }

    /** Greedily match until the predicate fails. */
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

    makeInlineToken(kind: TokenKind, value: string) {
        return new Token(kind, value, [this.startPos, this.cursor], this.tokenCounter++);
    }

    nextStringLiteral(isRaw = false)
    {
        const startPos = this.cursor;
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
            [startPos, this.cursor],
            this.tokenCounter++
        );
    }

    nextCharLiteral() {
        // A character literal is a single character surrounded by single quotes, such as 'a' or '5'.
        // A character literal may also be a single escape sequence, such as '\n' or '\x7F'.
        // A character literal may also be a single Unicode code point, such as '\u{1F600}'.
        const startPos = this.cursor;
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
            throw new LexerError(`Invalid character literal`, this.currentLine, this.lineCursor);
        }
        this.advance();
        return new Token(TokenKind.CharLiteral, buffer, [startPos, this.cursor], this.tokenCounter++);
    }

    nextHexLiteral() {
        let buffer = '0x';
        const startPos = this.cursor - 1;
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
            [startPos, this.cursor],
            this.tokenCounter++
        );
    }

    nextBinaryLiteral() {
        let buffer = '0b';
        const startPos = this.cursor - 1;
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
            [startPos, this.cursor],
            this.tokenCounter++
        );
    }

    nextOctalLiteral() {
        let buffer = '0o';
        const startPos = this.cursor - 1;
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
            [startPos, this.cursor],
            this.tokenCounter++
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
        let buffer = '';

        do {
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
                const remaining = this.matchUntil((c) => !(c ?? '').match(/[0-9]/));
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
                buffer += this.matchUntil((c) => !(c ?? '').match(/[0-9]/));
                literalKind = TokenKind.FloatLiteral;
            }
            else {
                break;
            }
        } while (this.nextChar());

        // check the buffer
        if (buffer.endsWith('_')) {
            throw new LexerError(`Invalid number literal`, this.currentLine, this.lineCursor);
        }
        return new NumberToken(
            literalKind,
            NumberLiteralKind.Decimal,
            buffer,
            [startPos, this.cursor],
            this.tokenCounter++
        );
    }

    nextIdentifier() {
        let buffer = this.currentChar;
        while (this.nextChar()) {
            const c = this.currentChar;
            if (!isAlphaNumeric(c))
                break;
            buffer += c;
        }
        return this.makeInlineToken(TokenKind.Ident, buffer);
    }

    parseSpecialChar(): Token {
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
            return this.makeInlineToken(TokenKind.Slash, c);
        }
        else if (c === '.') {
            const next = this.lookAhead();
            // Check if it's a float
            if (isDigit(next)) {
                return this.nextNumberLiteral();
            }
            return this.makeInlineToken(TokenKind.Dot, c);
        }
        else if (c === '<') {
            const next = this.lookAhead();
            this.advance();
            this.advance();
            if (next === '<') {
                return this.makeInlineToken(TokenKind.LtLt, '<<');
            } else if (next === '=') {
                return this.makeInlineToken(TokenKind.Le, '<=');
            }
            // Doesn't match any of the above, retreat
            this.retreat();
            return this.makeInlineToken(TokenKind.Lt, '<');
        }
        else if (c === '>') {
            const next = this.lookAhead();
            this.advance();
            this.advance();
            if (next === '>') {
                return this.makeInlineToken(TokenKind.GtGt, '>>');
            }
            else if (next === '=') {
                return this.makeInlineToken(TokenKind.Ge, '>=');
            }
            this.retreat();
            return this.makeInlineToken(TokenKind.Gt, '>');
        }
        else if (c === '&') {
            const next = this.lookAhead();
            this.advance();
            if (next === '&') {
                this.advance();
                return this.makeInlineToken(TokenKind.AndAnd, '&&');
            }
            return this.makeInlineToken(TokenKind.And, '&');
        }
        else if (c === '|' && this.lookAhead() === '|') {
            const next = this.lookAhead();
            this.advance();
            if (next === '|') {
                this.advance();
                return this.makeInlineToken(TokenKind.OrOr, '||');
            }
            return this.makeInlineToken(TokenKind.Or, '|');
        }
        else if (c === '=') {
            this.advance();
            if (this.currentChar === '=') {
                this.advance();
                return this.makeInlineToken(TokenKind.EqEq, '==');
            }
            return this.makeInlineToken(TokenKind.Eq, c);
        }
        else if (c === '!') {
            this.advance();
            if (this.currentChar === '=') {
                this.advance();
                return this.makeInlineToken(TokenKind.BangEq, '!=');
            }
            return this.makeInlineToken(TokenKind.Bang, c);
        }
        else if (c === '-') {
            this.advance();
            if (this.currentChar === '>') {
                this.advance();
                return this.makeInlineToken(TokenKind.Arrow, '->');
            }
            return this.makeInlineToken(TokenKind.Minus, c);
        }
        else if (c in specialChars) {
            this.advance();
            return this.makeInlineToken(specialChars[c as keyof typeof specialChars], c);
        }
        // Unreachable
        throw new LexerError(`Unexpected special character \`${c}\``, this.currentLine, this.lineCursor);
    }

    nextToken() {
        if (isWhitespace(this.currentChar))
            while (isWhitespace(this.nextChar()));

        this.startPos = this.cursor;

        if (this.eof())
        {
            const position = this.cursor;
            // Eof has 0 length
            return new Token(TokenKind.Eof, "", [position, position], this.tokenCounter);
        }

        const currentChar = this.currentChar;

        if (currentChar === '"') {
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
            if (currentChar === "r" && this.lookAhead() === '"') {
                this.advance();
                return this.nextStringLiteral(true);
            }
            return this.nextIdentifier();
        }

        // Unreachable
        throw new LexerError(`Unexpected token \`${currentChar} (0x${currentChar?.charCodeAt(0).toString(16) ?? 'None'})\``, this.currentLine, this.lineCursor);
    }

    eof() {
        return this.cursor >= this.input.length;
    }

    [Symbol.iterator](): Iterator<Token, Nullable<Token>, undefined> {
        return {
            next: () => {
                if (this.cursor > this.input.length) {
                    return { done: true, value: null };
                }
                if (this.eof()) {
                    // This is to squeeze out the Eof at the end
                    const token = this.nextToken();
                    this.advance();
                    return { done: false, value: token };
                }
                return { done: false, value: this.nextToken() };
            }
        };
    }

    /** Consumes the input and returns a list of tokens. */
    tokenize() {
        return [...this];
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
