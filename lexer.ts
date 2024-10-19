import { Token, TokenKind, specialChars, NumberToken, NumberLiteralKind as IntLiteralKind } from "./tokens";
import { Nullable, isWhitespace, isSpecialChar, isDigit, isAlpha, isAlphaNumeric } from "./util";

export class Tokenizer {
    private lineCursor = 0;
    private cursor = 0;
    private startPos = 0;
    private line = 1;
    private multiCharOperators = [
        '<<', '>>', '&&', '||', '==', '!=', '<=', '>=', '**'
    ];
    constructor(public input: string) {}

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
        let next = this.input[this.advance()];
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
        let newIdx = this.cursor + offset;
        if (newIdx >= this.input.length) return null;
        return this.input[newIdx];
    }

    lookBehind(offset = 1) {
        let newIdx = this.cursor - offset;
        if (newIdx < 0) return null;
        return this.input[newIdx];
    }

    makeToken(kind: TokenKind, value: string) {
        return new Token(kind, value, this.line, 0, this.startPos, this.cursor);
    }

    nextStringLiteral(isRaw = false)
    {
        const startPos = this.cursor;
        let buffer = '';
        let c: string;
        if (isRaw) {
            while (c = this.nextChar()) {
                if (c === '"')
                    break;

                buffer += c;
            }
        }
        else {
            while (c = this.nextChar()) {
                if (c === '"' || c === '\n' || c === '\r')
                    break;

                buffer += c;
            }
        }
        if (c !== '"')
            throw new LexerError(`Unterminated ${isRaw ? 'raw ' : ''}string literal`, this.line, this.cursor);

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
            throw new LexerError(`Invalid character literal`, this.line, this.lineCursor);
        }
        this.advance()
        return this.makeToken(TokenKind.CharLiteral, buffer);
    }

    nextIntegerLiteral() {
        const startPos = this.cursor;
        let mode = TokenKind.IntLiteral;
        let literalKind = IntLiteralKind.Decimal;
        let c = this.input[this.cursor];
        let buffer = c;

        if (c === '0') {
            let nextChar = this.lookAhead();
            const leadMapping = {
                'x': IntLiteralKind.Hex,
                'b': IntLiteralKind.Binary,
                'o': IntLiteralKind.Octal,
            }
            if (nextChar! in leadMapping) {
                literalKind = leadMapping[nextChar as keyof typeof leadMapping];
                buffer += nextChar;
                this.advance();
            }
        }
        while (c = this.nextChar()) {
            if (literalKind === IntLiteralKind.Hex)
            {
                if (c.match(/[a-fA-F0-9_]/)) { buffer += c; }
                else if (isSpecialChar(c)) {
                    break;
                }
                else {
                    throw new LexerError(`Invalid hex literal`, this.line, this.lineCursor);
                }
            }
            else if (literalKind === IntLiteralKind.Binary)
            {
                if (c.match(/[0-1]/)) { buffer += c; }
                else if (isSpecialChar(c)) {
                    break;
                }
                else {
                    throw new LexerError(`Invalid binary literal`, this.line, this.lineCursor);
                }

            }
            else if (literalKind === IntLiteralKind.Octal)
            {
                if (c.match(/[0-7]/)) { buffer += c; }
                else if (isSpecialChar(c)) {
                    break;
                }
                else {
                    throw new LexerError(`Invalid octal literal`, this.line, this.lineCursor);
                }
            }
            else
            {
                if (c.match(/[0-9_]/)) {
                    buffer += c;
                } else if (c === '.') {
                    if (mode === TokenKind.FloatLiteral && buffer.includes('.')) {
                        if (buffer.endsWith('.')) {
                            // might mistake with range syntax
                            this.retreat();
                            break;
                        }
                        throw new LexerError(`Invalid float literal`, this.line, this.lineCursor);
                    }
                    mode = TokenKind.FloatLiteral;
                    buffer += c;
                } else if (c === 'e') {
                    const peek = this.lookAhead();
                    if (!["+", "-"].includes(peek || "") && !isDigit(peek))
                        break;
                    if (buffer.includes('e')) {
                        throw new LexerError(`Invalid float literal`, this.line, this.lineCursor);
                        // break;
                    }
                    buffer += c;
                    mode = TokenKind.FloatLiteral;
                } else if (c === '+' || c === '-') {
                    if (this.lookBehind() !== 'e')
                        break;
                    buffer += c;
                } else {
                    break;
                }
            }
        }

        // check the buffer
        return new NumberToken(mode, buffer, literalKind, this.line, startPos, this.cursor);
    }

    nextMulticharOperator() {

    }

    nextToken() {
        this.startPos = this.cursor;
        let c: Nullable<string> = this.currentChar;

        if (isWhitespace(c))
            while (isWhitespace(c = this.nextChar()));

        if (this.eof())
            return new Token(TokenKind.Eof, null, this.line, 0, this.cursor, this.cursor);

        let buffer = '';

        if (c === "r") {
            let peek = this.lookAhead();
            if (peek === '"') {
                this.advance();
                return this.nextStringLiteral(true);
            }
        }
        if (c === '"') {
            return this.nextStringLiteral();
        }
        if (c === "'") {
            return this.nextCharLiteral();
        }
        if (isSpecialChar(c)) {
            // Check for comments
            if (c === '/') {
                // Inline
                if (this.lookAhead() === '/') {
                    while (c = this.nextChar()) {
                        if (c === '\n')
                            break;
                    }
                    return this.nextToken();
                }
                // TODO: Add block comments, (docstring too)
                this.advance();
                return this.makeToken(TokenKind.Slash, c);
            }
            else if (c === '<' && this.lookAhead() === '<') {
                this.advance();
                this.advance();
                return this.makeToken(TokenKind.LtLt, '<<');
            }
            else if (c === '>' && this.lookAhead() === '>') {
                this.advance();
                this.advance();
                return this.makeToken(TokenKind.GtGt, '>>');
            }
            else if (c === '&' && this.lookAhead() === '&') {
                this.advance();
                this.advance();
                return this.makeToken(TokenKind.AndAnd, '&&');
            }
            else if (c === '|' && this.lookAhead() === '|') {
                this.advance();
                this.advance();
                return this.makeToken(TokenKind.OrOr, '||');
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
            else if (c === '<') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return this.makeToken(TokenKind.Le, '<=');
                }
                return this.makeToken(TokenKind.Lt, c);
            }
            else if (c === '>') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return this.makeToken(TokenKind.Ge, '>=');
                }
                return this.makeToken(TokenKind.Gt, c);
            }
            else {
                this.advance();
                return this.makeToken(specialChars[c!], c);
            }
        }
        if (isDigit(c)) {
            return this.nextIntegerLiteral();
        }
        if (isAlpha(c)) {
            buffer += c;
            while (c = this.nextChar()) {
                if (!isAlphaNumeric(c))
                    break
                buffer += c;
            }
            // if (buffer in keywords) {
            //     mode = keywords[buffer];
            // }
            return this.makeToken(TokenKind.Ident, buffer);
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
        super(`LexerError: ${message} at ${line}:${column}`);
    }

    // override toString() {
    //     return `LexerError: ${this.message} at ${this.line}:${this.column}`;
    // }
}

export function lexer(input: string) {
    let tokens: Token[] = [];
    let tokenizer = new Tokenizer(input);
    while (!tokenizer.eof()) {
        tokens.push(tokenizer.nextToken());
    }
    return [...tokens, ...(tokens[tokens.length - 1].type === TokenKind.Eof ? [] : [tokenizer.nextToken()])];
}