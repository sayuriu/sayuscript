import {
    Program,
    Identifier,
    Keyword,
    VariableDeclarationStatement,
    FnDeclarationStatement,
    ExpressionStatement,
    statementAllowedInBlock,
} from "./astNodes.ts";
import {
    Literal,
    Expression,
    BinaryExpr,
    BlockExpr,
    FnCallExpr,
    FnExpr,
    TupleExpr,
    UnaryExpr,
    exprCanStandalone
} from "./expression.ts";
import {
    UnaryOperators,
    BinaryOperators,
    constructOperator,
    tryConstructOperator
} from "./operators.ts";
import { Token, TokenKind, LiteralTokenTypes } from "./token.ts";
import { Keywords, tryResolveKeyword } from './keywords.ts';
import { todo, Nullable } from "./util.ts";

export class ParserError extends Error {
    constructor(message: string, public startPos: number, public endPos: number) {
        super(message);
    }
}

enum Restriction {
    None,
    Statement
}


export abstract class ParserBase {
    /** The current cursor position in the token stream. */
    protected cursor = 0;
    /** The token that is currently being visited. */
    get currentToken() {
        return this.tokens[this.cursor];
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
    expect(...types: Array<TokenKind | Array<TokenKind>>): Token {
        const expected = types.flat();
        const token = this.currentToken;
        if (!expected.includes(token.type)) {
            throw new ParserError(
                `Expected ${expected.length < 2 ? '' : 'any of'} ${expected.map(t => `\`${TokenKind[t as number]}\``)} but got ${TokenKind[token.type]}`,
                ...token.span,
            );
        }
        this.advance();
        return token;
    }

    /**
     * Grabs the current token and performs a type check against `types`.
     *
     * Advances the cursor and returns the consumed token if it matches, and returns false otherwise.
     * */
    consume(...types: Array<TokenKind | Array<TokenKind>>): Nullable<Token> {
        const token = this.currentToken;
        if (types.flat().includes(this.currentToken.type)) {
            this.advance();
            return token;
        }
        return null;
    }

    abstract parse(): unknown;
}

export class Parser extends ParserBase {
    constructor(protected tokens: Token[]) {
        super();
    }

    override parse() {
        return this.Program();
    }

    Program() {
        const statements = [];
        while (!this.eof()) {
            const stmt = this.Statement();
            if (!stmt) {
                break;
            }
            statements.push(stmt);
        }
        if (!this.eof()) {
            console.error(`Expecting Eof, got token ${this.currentToken}`)
        }
        return new Program(statements);
    }

    KeywordStatement(kw: Identifier, isInsideBlock = false)
    {
        const lastPos = kw.tokenSpan[0];
        switch (kw.keyword) {
            case Keywords.Let:
                return this.VariableDeclarationStatement();
            case Keywords.Action:
                try {
                    return this.FnDeclarationStatement();
                } catch (e) {
                    if (!isInsideBlock) {
                        throw e;
                    }
                    // Might be a tailing fn expression, so we fallback
                    this.cursor = lastPos;
                    return null;
                }
        }
        const badToken = this.tokens[kw.tokenSpan[0]];
        throw new ParserError(
            `Unexpected keyword \`${kw.keyword}\` in statement`,
            ...badToken.span,
        );
}

    VariableDeclarationStatement() {
        const letKw = this.lookBehind();
        let isMutable = false;
        let ident = this.expect(TokenKind.Ident);
        const kwCandidate = tryResolveKeyword(ident.content!);
        if (kwCandidate === Keywords.Var) {
            isMutable = true;
            ident = this.expect(TokenKind.Ident);
        }
        this.expect(TokenKind.Eq);
        const expr = this.Expression();
        if (!expr) {
            throw new ParserError(
                `Expected an expression for variable declaration, got \`${this.currentToken}\``,
                ...this.currentToken.span,
            );
        }
        this.expect(TokenKind.Semi);
        return new VariableDeclarationStatement(
            isMutable,
            new Identifier(ident),
            expr,
            [letKw.tokenPos, expr.tokenSpan[1]]
        );
    }

    FnDeclarationStatement() {
        const kw = this.lookBehind();
        const fnExpr = this.FnExpression(true);
        return new FnDeclarationStatement(
            fnExpr.ident!,
            fnExpr.params,
            fnExpr.body as BlockExpr,
            [kw.tokenPos, fnExpr.tokenSpan[1]]
        );
    }

    /** Parses the next statement.
     *
     * @param isInsideBlock Whether the statement is being parsed inside a block.
    */
    Statement(isInsideBlock = false) {
        const token = this.currentToken;
        if (this.consume(TokenKind.Ident)) {
            const ident = new Identifier(token);
            if (ident.isKeyword()) {
                return this.KeywordStatement(ident, isInsideBlock);
            }
            this.retreat();
        }

        const lastPos = this.cursor;
        const expr = this.ExpressionWithRestrictions(Restriction.Statement);
        if (expr) {
            if (!this.consume(TokenKind.Semi)) {
                if (!isInsideBlock) {
                    throw new ParserError(
                        `Expected a semi-colon at the end of statement, got \`${this.currentToken}\``,
                        ...token.span,
                    );
                }
                // Might be a tailing expression, so we fallback
                this.cursor = lastPos;
                return null;
            }
            if (!exprCanStandalone(expr)) {
                const startToken = this.tokens[expr.tokenSpan[0]];
                const endToken = this.tokens[expr.tokenSpan[1]];
                throw new ParserError(
                    `Expression \`${expr}\` cannot be used as a statement`,
                    startToken.span[0],
                    endToken.span[1]
                )
            }
            return new ExpressionStatement(expr);
        }
        return null;
    }

    TupleExpression(first: Expression, lParen: Token): TupleExpr
    {
        const expressions = [first];
        while (!this.currentlyIs(TokenKind.RParen)) {
            const expression = this.Expression();
            if (!expression) {
                break;
            }
            expressions.push(expression);
            if (this.consume(TokenKind.Comma)) {
                continue;
            }
            break;
        }
        const rParen = this.currentToken;
        this.expect(TokenKind.RParen);
        return new TupleExpr(expressions, [lParen.tokenPos, rParen.tokenPos + 1]);
    }

    /** Parses the next unary prefix expression, eg. `-1`. */
    UnaryPrefixExpression(): Nullable<Expression>
    {
        const token = this.currentToken;
        if (this.consume(UnaryOperators)) {
            const expr = this.UnaryPrefixExpression();
            if (!expr) {
                throw new ParserError(
                    `Expected an expression right-hand side of unary expression, got \`${this.currentToken}\``,
                    ...this.currentToken.span,
                );
            }
            return new UnaryExpr(constructOperator(token), expr);
        }
        return this.PrimaryExpression();
    }

    UnaryPostfixExpression(): Expression
    {
        return todo("UnaryPostfixExpression");
    }

    BlockExpression(): BlockExpr {
        this.expect(TokenKind.LBrace);
        const statements = [];
        while (!this.currentlyIs(TokenKind.RBrace)) {
            const stmt = this.Statement(true);
            if (stmt) {
                if (!statementAllowedInBlock(stmt)) {
                    const startToken = this.tokens[stmt.tokenSpan[0]];
                    const endToken = this.tokens[stmt.tokenSpan[1]];
                    throw new ParserError(
                        `Statement \`${stmt.fullString()}\` is not allowed in a block`,
                        startToken.span[0],
                        endToken.span[1]
                    );
                }
                statements.push(stmt);
                continue;
            }
            break;
        }
        const tailingExpr = this.Expression();
        if (tailingExpr) {
            statements.push(tailingExpr);
        }
        this.expect(TokenKind.RBrace);
        return new BlockExpr(statements);
    }

    FnExpression(standalone = false): FnExpr
    {
        const kw = this.lookBehind();
        const ident = this.consume(TokenKind.Ident);
        if (standalone && !ident) {
            throw new ParserError(
                `Expected an identifier for function declaration`,
                ...this.currentToken.span,
            );
        }
        const maybeKw = tryResolveKeyword(ident?.content ?? '');
        if (maybeKw !== null)
        {
            throw new ParserError(
                `Expected an identifier for function declaration, got keyword \`${Keywords[maybeKw]}\``,
                ...ident!.span,
            );
        }
        const fnName = ident !== null ? new Identifier(ident) : null;
        const params: Identifier[] = [];

        this.expect(TokenKind.LParen);
        while (!this.currentlyIs(TokenKind.RParen)) {
            params.push(new Identifier(this.expect(TokenKind.Ident)));
            if (this.consume(TokenKind.Comma)) {
                continue;
            }
            break;
        }
        this.expect(TokenKind.RParen);
        this.expect(TokenKind.Arrow);
        const body = this.BlockExpression();
        return new FnExpr(
            fnName,
            params,
            body,
            [kw.tokenPos, this.cursor]
        );
    }

    FnCallExpression(ident: Identifier): Expression
    {
        const args = [];
        while (!this.currentlyIs(TokenKind.RParen)) {
            const arg = this.Expression();
            if (!arg) {
                break;
            }
            args.push(arg);
            if (this.consume(TokenKind.Comma)) {
                continue;
            }
            break;
        }
        const rParen = this.currentToken;
        this.expect(TokenKind.RParen);
        return new FnCallExpr(
            ident,
            args,
            [ident.tokenSpan[0], rParen.tokenPos + 1]
        );
    }

    KeywordExpression(kw: Keyword): Expression
    {
        switch (kw.keyword) {
            case Keywords.Action:
                return this.FnExpression();
        }
        const badToken = this.tokens[kw.tokenSpan[0]];
        throw new ParserError(
            `Unexpected keyword \`${kw.name}\` in expression`,
            ...badToken.span,
        );
    }

    /** Parses the next primary expression. */
    PrimaryExpression(): Nullable<Expression>
    {
        const token = this.currentToken;
        if (this.consume(TokenKind.Ident, LiteralTokenTypes)) {
            if (token.type === TokenKind.Ident) {
                const ident = new Identifier(token);
                if (ident.isKeyword()) {
                    return this.KeywordExpression(ident);
                }
                if (this.consume(TokenKind.LParen)) {
                    // Paren exists, must be a function call
                    return this.FnCallExpression(ident);
                }
                return ident;
            }
            return new Literal(token);
        }
        else if (this.consume(TokenKind.LParen)) {
            const lparen = token;
            const expr = this.Expression();
            if (!expr) {
                if (this.currentlyIs(TokenKind.RParen)) {
                    // OK, it's an empty tuple
                    this.expect(TokenKind.RParen);
                    return new TupleExpr([], [lparen.tokenPos, this.currentToken.tokenPos + 1]);
                }
                throw new ParserError(
                    `Expected an expression inside parentheses, got \`${this.currentToken}\``,
                    ...this.currentToken.span,
                );
            }
            // If we find a coma, then it's a tuple
            if (this.consume(TokenKind.Comma)) {
                return this.TupleExpression(expr, lparen);
            }
            this.expect(TokenKind.RParen);
            return expr;
        }
        return null;
    }

    /** Parses the next binary expression.
     * The second boolean return value indicates if something new was parsed.
    */
    BinaryExpression(minPrecedence: number, lhs: Expression): [Expression, boolean]
    {
        let token: Token;
        let somethingParsed = false;
        while (token = this.consume(BinaryOperators) as Token) {
            const currentOp = constructOperator(token);
            const currentOpPrecedence = currentOp.precedence!;
            if (currentOpPrecedence < minPrecedence) {
                break;
            }
            let rhs = this.UnaryPrefixExpression();
            if (!rhs) {
                // Exists a binary operator, but there's no right-hand side of the expression
                // TODO: Check if the operator is postfix
                // * For now there's no postfix op yet, so we will throw
                throw new ParserError(
                    `Expected an expression right-hand side of binary expression, got \`${this.currentToken}\``,
                    ...token.span
                );
            }
            somethingParsed = true;
            const nextOpPrecedence = tryConstructOperator(this.currentToken)?.precedence;
            if (nextOpPrecedence)
            {
                if (currentOpPrecedence < nextOpPrecedence) {
                    const [candidate, parsed] = this.BinaryExpression(currentOpPrecedence + 1, rhs);
                    if (parsed) {
                        rhs = candidate;
                    }
                }
            }
            return [new BinaryExpr(lhs, currentOp, rhs), somethingParsed];
        }
        return [lhs, somethingParsed];
    }

    /** Parses the next expression, with some restrictions. */
    ExpressionWithRestrictions(restrictions: Restriction)
    {
        const startPos = this.cursor;
        const expr = this.Expression();
        if (!expr) {
            this.cursor = startPos;
            return null;
        }
        // if (restrictions === Restriction.Statement) {
        //     if (!exprCanStandalone(expr))
        //     {
        //         throw new ParserError(
        //             `Expression \`${expr}\` cannot be used as a statement`,
        //             expr.lineSpan[0],
        //             expr.positionSpan[0],
        //             expr.positionSpan[1]
        //         );
        //     }
        // }
        return expr;
    }

    /* Parses the next expression. */
    Expression() {
        let lhs = this.UnaryPrefixExpression();
        if (!lhs) {
            return null;
        }
        while (true)
        {
            if (this.currentlyIs(TokenKind.Semi, TokenKind.Eof)) {
                return lhs;
            }
            const [expr, somethingParsed] = this.BinaryExpression(0, lhs);
            if (!somethingParsed) {
                return expr;
            }
            const nextBinOp = this.currentlyIs(BinaryOperators);
            if (!nextBinOp) {
                return expr;
            }
            lhs = expr;
        }
    }
}