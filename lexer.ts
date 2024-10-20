import { Token, TokenKind, specialChars, NumberToken, NumberLiteralKind as IntLiteralKind } from "./tokens.ts";
import { Nullable, isWhitespace, isSpecialChar, isDigit, isAlpha, isAlphaNumeric } from "./util.ts";

export class Tokenizer {
    private lineCursor = 0;
    private cursor = 0;
    private startPos = 0;
    private line = 1;
    private multiCharOperators = [
        '<<', '>>', '&&', '||', '==', '!=', '<=', '>=', '**'
    ];
    constructor(public input: string) {}

    registerMultiCharOperator(op: string, kind: number) {
        if (this.multiCharOperators.includes(op))
            throw new Error(`Operator \`${op}\` is already registered.`);
        this.multiCharOperators.push(op);
    }

    get currentChar() {
        return this.input[this.cursor];
    }

    retreat() {
        return --this.cursor;
    }

    advance() {
        this.cursor++;
        this.lineCursor++;
        return this.cursor;
    }

    nextChar() {
        if (this.eof()) return null;
        const next = this.input[this.advance()];
        if (next === '\n') {
            this.line++;
            this.lineCursor = 0;
        }
        return next;
    }

    lookBehindUntil(predicate: (c: Nullable<string>) => boolean) {
        let pos = 1;
        while (predicate(this.lookBehind(pos))) {
            pos++;
        }
        return pos;
    }

    lookAhead(offset = 1) {
        const newIdx = this.cursor + offset;
        if (newIdx >= this.input.length) return null;
        return this.input[newIdx];
    }

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
        return new Token(kind, value, this.line, 0, this.startPos, this.cursor);
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
            throw new LexerError(`Unterminated ${isRaw ? 'raw ' : ''}string literal`, this.line, this.lineCursor);

        this.advance();
        return new Token(
            isRaw ? TokenKind.RawStrLiteral : TokenKind.StrLiteral,
            buffer,
            this.line,
            this.line - startPos,
            startPos,
            this.cursor
        );
    }

    nextCharLiteral() {
        // A character literal is a single character surrounded by single quotes, such as 'a' or '5'.
        // A character literal may also be a single escape sequence, such as '\n' or '\x7F'.
        // A character literal may also be a single Unicode code point, such as '\u{1F600}'.
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
            throw new LexerError(`Invalid character literal`, this.line, this.lineCursor);
        }
        this.advance()
        return this.makeToken(TokenKind.CharLiteral, buffer);
    }

    nextHexLiteral() {
        let buffer = '0x';
        while (this.nextChar()) {
            const c = this.currentChar;
            if (c.match(/[a-fA-F0-9]/)) {
                buffer += c;
            } else if (isWhitespace(c) || isSpecialChar(c)) {
                break;
            } else if (c === '_' && !buffer.endsWith('_')) {
                    buffer += c;
            } else {
                throw new LexerError(`Invalid hex literal \`${buffer + c}\``, this.line, this.lineCursor);
            }
        }
        if (!isDigit(buffer[buffer.length - 1])) {
            throw new LexerError(`Invalid hex literal \`${buffer}\``, this.line, this.lineCursor);
        }
        return new NumberToken(TokenKind.IntLiteral, buffer, IntLiteralKind.Hex, this.line, this.startPos, this.cursor);
    }

    nextBinaryLiteral() {
        let buffer = '0b';
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
                throw new LexerError(`Invalid binary literal \`${buffer + c}\``, this.line, this.lineCursor);
            }
        }
        if (!isDigit(buffer[buffer.length - 1])) {
            throw new LexerError(`Invalid binary literal \`${buffer}\``, this.line, this.lineCursor);
        }
        return new NumberToken(TokenKind.IntLiteral, buffer, IntLiteralKind.Binary, this.line, this.startPos, this.cursor);
    }

    nextOctalLiteral() {
        let buffer = '0o';
        while (this.nextChar()) {
            const c = this.currentChar;
            if (c.match(/[0-7]/)) {
                buffer += c;
            } else if (isWhitespace(c) || isSpecialChar(c)) {
                break;
            } else if (c === '_' && !buffer.endsWith('_')) {
                buffer += c;
            } else {
                throw new LexerError(`Invalid octal literal \`${buffer + c}\``, this.line, this.lineCursor);
            }
        }
        if (!isDigit(buffer[buffer.length - 1])) {
            throw new LexerError(`Invalid octal literal \`${buffer}\``, this.line, this.lineCursor);
        }
        return new NumberToken(TokenKind.IntLiteral, buffer, IntLiteralKind.Octal, this.line, this.startPos, this.cursor);
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
        let mode = TokenKind.IntLiteral;
        let buffer = this.currentChar;

        while (this.nextChar()) {
            const c = this.currentChar;
            if (c.match(/[0-9_]/)) {
                if (c === '_') {
                    if (buffer.endsWith('_')) {
                        throw new LexerError(`Invalid number literal`, this.line, this.lineCursor);
                    }
                }
                buffer += c;
            }
            else if (c === '.') {
                if (mode === TokenKind.FloatLiteral) {
                    // Ambiguous to a spread operator
                    // ...On another thought, maybe that's for later
                    // if (buffer.endsWith('.')) {
                    //     break;
                    // }
                    throw new LexerError(`Invalid float literal \`${buffer + c}\``, this.line, this.lineCursor);
                }
                mode = TokenKind.FloatLiteral;
                const remaining = this.matchUntil((c) => !c.match(/[0-9]/));
                buffer += c + remaining;
            }
            else if (c === 'e') {
                const next = this.lookAhead() ?? '';
                if (["+", "-"].includes(next)) {
                    if (!isDigit(this.lookAhead(2))) {
                        throw new LexerError(`Invalid exponent literal \`${buffer + c + next}\``, this.line, this.lineCursor);
                    }
                }
                else if (!isDigit(next)) {
                    throw new LexerError(`Invalid exponent literal \`${buffer + c + next}\``, this.line, this.lineCursor);
                }
                buffer += c + next;
                this.advance();
                buffer += this.matchUntil((c) => !c.match(/[0-9]/));
                mode = TokenKind.FloatLiteral;
            }
            else {
                break;
            }
        }

        // check the buffer
        if (buffer.endsWith('_')) {
            throw new LexerError(`Invalid number literal`, this.line, this.lineCursor);
        }
        return new NumberToken(mode, buffer, IntLiteralKind.Decimal, this.line, startPos, this.cursor);
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
            return this.makeToken(TokenKind.AndAnd, '&&');
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

    nextMulticharOperator() {
        let buffer = this.currentChar;
        let c: Nullable<string>;
    }

    nextToken() {
        if (isWhitespace(this.currentChar))
            while (isWhitespace(this.nextChar()));

        if (this.eof())
            return new Token(TokenKind.Eof, null, this.line, 0, this.cursor, this.cursor);

        this.startPos = this.cursor;
        const c: Nullable<string> = this.currentChar;

        if (c === "r") {
            const next = this.lookAhead();
            if (next === '"') {
                this.advance();
                return this.nextStringLiteral(true);
            }
        }
        else if (c === '"') {
            return this.nextStringLiteral();
        }
        else if (c === "'") {
            return this.nextCharLiteral();
        }
        else if (isSpecialChar(c)) {
            return this.parseSpecialChar();
        }
        else if (isDigit(c)) {
            return this.nextNumberLiteral();
        }
        else if (isAlpha(c)) {
            return this.nextIdentifier();
        }

        // Unreachable
        throw new LexerError(`Unexpected token \`${c} (0x${c?.charCodeAt(0).toString(16) ?? 'None'})\``, this.line, this.lineCursor);
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