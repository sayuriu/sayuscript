import {
    Program,
    Identifier,
    type Keyword,
} from "./astNodes.ts";
import {
    VariableDeclarationStatement,
    FnDeclarationStatement,
    ExpressionStatement,
    statementAllowedInBlock,
    Statement,
    ReturnStatement,
    FnKind,
    ExternImportStatement,
    ImportStatement,
    StaticImportStatement,
} from "./statements.ts";
import {
    Literal,
    Expression,
    BinaryExpr,
    BlockExpr,
    FnCallExpr,
    FnExpr,
    TupleExpr,
    UnaryExpr,
    exprCanStandalone,
    PathQualifierExpr,
    NAMESPACE_CURRENT_FILE,
    NAMESPACE_ALL_SYM
} from "./expression.ts";
import {
    UnaryOperators,
    BinaryOperators,
    constructOperator,
    tryConstructOperator
} from "./operators.ts";
import { Token, TokenKind, LiteralTokenTypes } from "./token.ts";
import { Keywords, tryResolveKeyword } from './keywords.ts';
import { todo, Nullable, Span } from "./util.ts";
import { ImmediateCallExpr } from "./expression.ts";
import { Parser, ParserError, Restriction } from "./parser.ts";
import { Ok, Result, IntoResult } from "./result.ts";
import { Err } from "./result.ts";


export class DefaultParser extends Parser {
    constructor(protected tokens: Token[]) {
        super();
        // FIXME: Make this lazy, if possible
        this.tokens = tokens.filter(
            (token) =>
                token.type !== TokenKind.Whitespace
                && token.type !== TokenKind.LineComment
                && token.type !== TokenKind.BlockComment
        );
    }

    override parse(): Program {
        return this.Program().unwrapOrThrow();
    }

    override recover(): void {
        this.advance();

        while (!this.eof()) {
            if (this.lookBehind().type === TokenKind.Semi) {
                break;
            }
            if (this.currentlyIs(TokenKind.Ident)) {
                const ident = new Identifier(this.currentToken);
                if (ident.isKeyword()) {
                    return;
                }
            }
            this.advance();
        }
    }

    forwardError(message: string, span: Span): never {
        const error = new ParserError(message, span[0], span[1]);
        this.enounteredErrors = true;
        this.accumulatedErrors.push(error);
        this.recover();
        throw error;
    }

    @IntoResult()
    Program(): Result<Program, AggregateError> {
        const statements = [];
        while (!this.eof()) {
            const stmtResult = this.Statement();
            if (stmtResult.isErr()) {
                this.recover();
                continue;
            }
            const stmt = stmtResult.unwrap();
            if (!stmt) {
                break;
            }
            statements.push(stmt);
        }
        if (!this.eof()) {
            this.constructError(`Expecting Eof, got token ${this.currentToken}`, this.currentToken.span);
        }
        if (this.enounteredErrors)
        {
            throw new AggregateError(this.accumulatedErrors, "Parser errors encountered during parsing.");
        }
        return Ok(new Program(statements));
    }

    @IntoResult()
    KeywordStatement(kw: Identifier, isInsideBlock = false): Result<Nullable<Statement>, ParserError>
    {
        const lastPos = kw.tokenSpan[0];
        switch (kw.keyword) {
            case Keywords.Let:
                return this.VariableDeclarationStatement();
            case Keywords.Action:
            case Keywords.Compute:
                try {
                    return this.FnDeclarationStatement(kw);
                } catch (e) {
                    if (!isInsideBlock) {
                        throw e;
                    }
                    // Might be a tailing fn expression, so we fallback
                    this.cursor = lastPos;
                    return Ok(null);
                }
            case Keywords.Return: {
                const expr = this.Expression().unwrapOrThrow();
                if (!expr) {
                    throw this.constructError(
                        `Expected an expression for return statement, got \`${this.currentToken}\``,
                        this.currentToken.span,
                    );
                }
                this.expect(TokenKind.Semi);
                return Ok(new ReturnStatement(expr));
            }
            case Keywords.Import: {
                return this.ImportStatement();
            }
        }
        const badToken = this.tokens[kw.tokenSpan[0]];
        throw this.constructError(
            `Unexpected keyword \`${kw.keyword}\` in statement`,
            badToken.span,
        );
    }

    @IntoResult()
    ImportStatement(): Result<ImportStatement, ParserError> {
        const importKw = this.lookBehind();
        const topIdentTok = this.consume(TokenKind.Ident);
        if (!topIdentTok)
        {
            throw this.constructError(
                `Expected an identifier after import keyword, got \`${this.currentToken}\``,
                this.currentToken.span,
            );
        }
        const kwCandidate = tryResolveKeyword(topIdentTok.content);
        if (kwCandidate) {
            if (kwCandidate !== Keywords.Extern) {
                throw this.constructError(
                    `Unexpected keyword \`${topIdentTok.content}\` used in import statement`,
                    topIdentTok.span,
                );
            }
            return this.ExternImportStatement();
        }
        const topIdent = new Identifier(topIdentTok);
        this.expect(TokenKind.ColonColon);
        const pathQualifier = this.PathQualifierSegment(topIdent, Restriction.Import).unwrapOrThrow();
        this.expect(TokenKind.Semi);
        return Ok(
            new StaticImportStatement(
                pathQualifier,
                [importKw.tokenPos, this.cursor],
            )
        )
    }

    @IntoResult()
    PathQualifierSegment(parent: Identifier, restriction: Restriction): Result<PathQualifierExpr, ParserError> {
        const childTok = this.consume<TokenKind>(TokenKind.Ident);
        const children: Array<PathQualifierExpr | Identifier> = [];
        let aliasIdent: Nullable<Identifier> = null;
        let canUseAs = true;

        if (childTok) {
            // ::Ident
            const childIdent = new Identifier(childTok);
            children.push(
                this.consume(TokenKind.ColonColon)
                    ? this.PathQualifierSegment(childIdent, restriction).unwrapOrThrow()
                    : childIdent,
            )
        } else if (this.consume(TokenKind.Star)) {
            // ::*
            if (restriction !== Restriction.Import) {
                throw this.constructError(
                    `Unexpected wildcard qualifier in this context`,
                    this.currentToken.span,
                );
            }
            children.push(new Identifier(this.currentToken));
            canUseAs = false;
        } else if (this.consume(TokenKind.LBrace)) {
            // ::{
            if (restriction !== Restriction.Import) {
                throw this.constructError(
                    `Unexpected multiple import qualifier in this context`,
                    this.currentToken.span,
                );
            }
            while (!this.currentlyIs(TokenKind.RBrace)) {
                const childTok = this.consume(TokenKind.Ident);
                if (!childTok) {
                    throw this.constructError(
                        `Expected an identifier inside path qualifier, got \`${this.currentToken}\``,
                        this.currentToken.span,
                    );
                }
                if (tryResolveKeyword(childTok.content)) {
                    throw this.constructError(
                        `Unexpected keyword \`${childTok.content}\` used as a path qualifier identifier`,
                        childTok.span,
                    );
                }
                const didColonColon = this.consume(TokenKind.ColonColon);
                if (!didColonColon)
                {
                    this.retreat();
                }
                const childSegment = this.PathQualifierSegment(new Identifier(childTok), restriction).unwrapOrThrow()
                if (!didColonColon) {
                    childSegment.child = []
                }
                children.push(childSegment);
                if (!this.consume(TokenKind.Comma)) {
                    break;
                }
                if (this.currentlyIs(TokenKind.RBrace)) {
                    throw this.constructError(
                        `Trailing comma inside path qualifier`,
                        this.currentToken.span,
                    );
                }
            }
            this.expect(TokenKind.RBrace);
            canUseAs = false;
            if (children.length === 0) {
                throw this.constructError(
                    `Unexpected empty subpath qualifier`,
                    this.currentToken.span,
                );
            }
        }
        const kwAs = this.consume(TokenKind.Ident);
        if (kwAs) {
            const kwCandidate = tryResolveKeyword(kwAs.content);
            if (!kwCandidate) {
                throw this.constructError(
                    `Unexpected identifier \`${kwAs.content}\` in this context`,
                    kwAs.span,
                );
            }
            else if (kwCandidate !== Keywords.As) {
                throw this.constructError(
                    `\`as\` is the only valid keyword after a path qualifier, got \`${this.currentToken.content}\``,
                    kwAs.span,
                );
            }
            else if (!canUseAs) {
                throw this.constructError(
                    `\`${kwAs.content}\` clause cannot be used in this context`,
                    kwAs.span,
                );
            }
            const aliasTok = this.consume(TokenKind.Ident);
            if (!aliasTok) {
                throw this.constructError(
                    `Expected an identifier after 'as' keyword, got \`${this.currentToken}\``,
                    this.currentToken.span,
                );
            }
            if (tryResolveKeyword(aliasTok.content)) {
                throw this.constructError(
                    `Unexpected keyword \`${aliasTok.content}\` used as an import alias identifier`,
                    aliasTok.span,
                );
            }
            aliasIdent = new Identifier(aliasTok);
        }

        return Ok(new PathQualifierExpr(
            parent,
            children,
            aliasIdent,
            [parent.tokenSpan[0], this.cursor + 1],
        ));
    }

    @IntoResult()
    ExternImportStatement(): Result<ExternImportStatement, ParserError> {
        const importKw = this.lookBehind(2);
        const externResource = this.consume(TokenKind.StrLiteral);
        if (!externResource) {
            throw this.constructError(
                `Expected a string literal for extern resource, got \`${this.currentToken}\``,
                this.currentToken.span,
            );
        }
        const kwAs = this.consume(TokenKind.Ident);
        if (!kwAs) {
            throw this.constructError(
                `Missing 'as' keyword after extern resource`,
                this.currentToken.span,
            );
        }
        if (tryResolveKeyword(kwAs.content!) !== Keywords.As) {
            throw this.constructError(
                `Expected 'as' keyword after extern resource, got \`${kwAs.content}\``,
                kwAs.span,
            );
        }
        const identifierToken = this.consume(TokenKind.Ident);
        if (!identifierToken) {
            throw this.constructError(
                `Expected an identifier after 'as' keyword, got \`${this.currentToken}\``,
                this.currentToken.span,
            );
        }
        if (tryResolveKeyword(identifierToken.content!)) {
            throw this.constructError(
                `Expected keyword \`${identifierToken.content}\` used as an external resource alias identifier`,
                identifierToken.span,
            );
        }
        this.expect(TokenKind.Semi);
        const identifier = new Identifier(identifierToken);
        return Ok(new ExternImportStatement(
            identifier,
            externResource,
            [importKw.tokenPos, this.cursor],
        ));
    }

    @IntoResult()
    VariableDeclarationStatement(): Result<VariableDeclarationStatement, ParserError> {
        const letKw = this.lookBehind();
        let isMutable = false;
        let ident = this.expect(TokenKind.Ident);
        const kwCandidate = tryResolveKeyword(ident.content!);
        if (kwCandidate === Keywords.Var) {
            isMutable = true;
            ident = this.expect(TokenKind.Ident);
        }
        this.expect(TokenKind.Eq);
        const expr = this.Expression().unwrapOrThrow();
        if (!expr) {
            throw this.constructError(
                `Expected an expression for variable declaration, got \`${this.currentToken}\``,
                this.currentToken.span,
            );
        }
        this.expect(TokenKind.Semi);
        return Ok(new VariableDeclarationStatement(
            isMutable,
            new Identifier(ident),
            expr,
            [letKw.tokenPos, expr.tokenSpan[1]]
        ));
    }

    @IntoResult()
    FnDeclarationStatement(identKw: Identifier): Result<FnDeclarationStatement, ParserError> {
        const fnExpr = this.FnExpression(identKw, true).unwrapOrThrow();
        return Ok(new FnDeclarationStatement(
            fnExpr.ident!,
            fnExpr.params,
            fnExpr.body as BlockExpr,
            [identKw.tokenSpan[0], fnExpr.tokenSpan[1]],
            identKw.keyword === Keywords.Action ? FnKind.Action : FnKind.Compute
        ));
    }

    /** Parses the next statement.
     *
     * @param isInsideBlock Whether the statement is being parsed inside a block.
    */
    @IntoResult()
    Statement(isInsideBlock = false): Result<Nullable<Statement>, ParserError>{
        const token = this.currentToken;
        if (this.consume(TokenKind.Ident)) {
            // Double-advance
            const ident = new Identifier(token);
            if (ident.isKeyword()) {
                return this.KeywordStatement(ident, isInsideBlock);
            }
            this.retreat();
        }

        const lastPos = this.cursor;
        const expr = this.ExpressionWithRestrictions(Restriction.Statement).unwrapOrThrow();
        if (expr) {
            if (!this.consume(TokenKind.Semi)) {
                if (!isInsideBlock) {
                    throw this.constructError(
                        `Expected a semi-colon at the end of statement, got \`${this.currentToken}\``,
                        token.span,
                    );
                }
                // Might be a tailing expression, so we fallback
                this.cursor = lastPos;
                return Ok(null);
            }
            if (!exprCanStandalone(expr)) {
                const startToken = this.tokens[expr.tokenSpan[0]];
                const endToken = this.tokens[expr.tokenSpan[1]];
                throw this.constructError(
                    `Expression \`${expr}\` cannot be used as a statement`,
                    [startToken.span[0], endToken.span[1]]
                )
            }
            return Ok(new ExpressionStatement(expr));
        }
        return Ok(null);
    }

    @IntoResult()
    TupleExpression(first: Expression, lParen: Token): Result<TupleExpr, ParserError>
    {
        const expressions = [first];
        while (true) {
            const expression = this.Expression().unwrapOrThrow();
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
        return Ok(new TupleExpr(expressions, [lParen.tokenPos, rParen.tokenPos + 1]));
    }

    /** Parses the next unary prefix expression, eg. `-1`. */
    @IntoResult()
    UnaryPrefixExpression(): Result<Nullable<Expression>, ParserError>
    {
        const token = this.currentToken;
        if (this.consume(UnaryOperators)) {
            const expr = this.UnaryPrefixExpression().unwrapOrThrow();
            if (!expr) {
                throw this.constructError(
                    `Expected an expression right-hand side of unary expression, got \`${this.currentToken}\``,
                    this.currentToken.span,
                );
            }
            return Ok(new UnaryExpr(constructOperator(token), expr));
        }
        return this.PrimaryExpression();
    }

    UnaryPostfixExpression(): Expression
    {
        return todo("UnaryPostfixExpression");
    }

    @IntoResult()
    BlockExpression(): Result<BlockExpr, ParserError> {
        const lBrace = this.currentToken;
        this.expect(TokenKind.LBrace);
        const statements = [];
        while (!this.currentlyIs(TokenKind.RBrace)) {
            const stmtResult = this.Statement(true);
            if (stmtResult.isErr())
            {
                this.recover()
                continue;
            }
            const stmt = stmtResult.unwrap();
            if (stmt) {
                if (!statementAllowedInBlock(stmt)) {
                    const startToken = this.tokens[stmt.tokenSpan[0]];
                    const endToken = this.tokens[stmt.tokenSpan[1]];
                    throw this.constructError(
                        `Statement \`${stmt.tokenSpan}\` is not allowed in a block`,
                        [startToken.span[0], endToken.span[1]]
                    );
                }
                statements.push(stmt);
                continue;
            }
            break;
        }
        const tailingExpr = this.Expression().unwrapOrThrow();
        if (tailingExpr) {
            statements.push(tailingExpr);
        }
        this.expect(TokenKind.RBrace);
        return Ok(new BlockExpr(statements, [lBrace.tokenPos, this.cursor]));
    }

    /** Parses the next function expression.
     * If `standalone` is set to `true`, then the function must have a name.
     *
     */
    @IntoResult()
    FnExpression(fnKw: Identifier, standalone = false): Result<FnExpr, ParserError>
    {
        if (fnKw.keyword !== Keywords.Action && fnKw.keyword !== Keywords.Compute) {
            throw this.constructError(
                `Expected a function keyword, got \`${fnKw.keyword}\``,
                fnKw.tokenSpan,
            );
        }
        const ident = this.consume(TokenKind.Ident);
        if (standalone && !ident) {
            throw this.constructError(
                `Expected an identifier for function declaration`,
                this.currentToken.span,
            );
        }
        const maybeKw = tryResolveKeyword(ident?.content ?? '');
        if (maybeKw !== null)
        {
            throw this.constructError(
                `Expected an identifier for function declaration, got keyword \`${Keywords[maybeKw]}\``,
                ident!.span,
            );
        }
        const fnName: Nullable<Identifier> = ident !== null ? new Identifier(ident) : null;
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

        // TODO: Error with context
        const body = (standalone ? this.BlockExpression() : this.Expression()).unwrapOrThrow();
        if (!body) {
            throw this.constructError(
                `Expected an expression for function body, got \`${this.currentToken}\``,
                this.currentToken.span,
            );
        }
        if (body instanceof BlockExpr && body.hasTailingExpr && fnKw.keyword === Keywords.Action) {
            throw this.constructError(
                `Actions cannot have a tailing expression`,
                body.tokenSpan,
            );
        }
        return Ok(new FnExpr(
            fnName,
            params,
            body,
            [fnKw.tokenSpan[0], this.cursor],
            fnKw.keyword === Keywords.Action ? FnKind.Action : FnKind.Compute
        ));
    }

    /** Parses a function call expression, such as
     * ```sayu
     * print(1, 2, "amogus")
     * ```
    */
    @IntoResult()
    FnCallExpression(ident: Identifier): Result<FnCallExpr, ParserError>
    {
        const args = [];
        // LParen Expr (Comma Expr)* RParen
        do {
            const arg = this.Expression().unwrapOrThrow();
            if (!arg) {
                break; // no expr, invalid state
            }
            args.push(arg);
        } while (this.consume(TokenKind.Comma));
        try {
            this.expect(TokenKind.RParen);
        } catch (e) {
            return Err(e as ParserError);
        }

        return Ok(new FnCallExpr(
            ident,
            args,
            [ident.tokenSpan[0], this.cursor]
        ));
    }

    @IntoResult()
    ImmediateCallExpression(fnValue: Expression): Result<ImmediateCallExpr, ParserError>{
        const args = [];
        // LParen Expr (Comma Expr)* RParen
        do {
            const arg = this.Expression().unwrapOrThrow();
            if (!arg) {
                break; // no expr, invalid state
            }
            args.push(arg);
        } while (this.consume(TokenKind.Comma));
        try {
            this.expect(TokenKind.RParen);
        } catch (e) {
            return Err(e as ParserError);
        }
        const fnCall = new ImmediateCallExpr(
            fnValue,
            args,
            [fnValue.tokenSpan[0], this.cursor]
        );
        // ? There exists another call site. Can I make this a DFA?
        if (this.consume(TokenKind.LParen)) {
            return this.ImmediateCallExpression(fnCall);
        }
        return Ok(fnCall);
    }

    @IntoResult()
    KeywordExpression(kw: Keyword): Result<Expression, ParserError>
    {
        switch (kw.keyword) {
            case Keywords.Action:
            case Keywords.Compute:
                return this.FnExpression(kw);
        }
        const badToken = this.tokens[kw.tokenSpan[0]];
        throw this.constructError(
            `Unexpected keyword \`${kw.name}\` in expression`,
            badToken.span,
        );
    }

    /** Parses the next primary expression. */
    @IntoResult()
    PrimaryExpression(): Result<Nullable<Expression>, ParserError>
    {
        const token = this.currentToken;
        if (this.consume(TokenKind.Ident)) {
            const ident = new Identifier(token);
            if (this.consume(TokenKind.ColonColon)) {
                // Path qualifier
                return this.PathQualifierSegment(ident, Restriction.Expression);
            }
            if (ident.isKeyword()) {
                return this.KeywordExpression(ident);
            }
            else if (this.consume(TokenKind.LParen)) {
                // Paren exists, must be a function call
                return this.FnCallExpression(ident);
            }
            return Ok(ident);
        }
        else if (this.consume(LiteralTokenTypes)) {
            return Ok(new Literal(token));
        }
        else if (this.consume(TokenKind.LParen)) {
            const lParen = token;
            const expr = this.Expression().unwrapOrThrow();
            if (!expr) {
                if (this.currentlyIs(TokenKind.RParen)) {
                    // OK, it's an empty tuple
                    this.expect(TokenKind.RParen);
                    return Ok(new TupleExpr([], [lParen.tokenPos, this.currentToken.tokenPos + 1]));
                }
                throw this.constructError(
                    `Expected an expression inside parentheses, got \`${this.currentToken}\``,
                    this.currentToken.span,
                );
            }
            // If we find a coma, then it's a tuple
            if (this.consume(TokenKind.Comma)) {
                return this.TupleExpression(expr, lParen);
            }
            this.expect(TokenKind.RParen);
            return Ok(expr);
        }
        else if (this.consume(TokenKind.LBrace)) {
            this.retreat();
            return this.BlockExpression();
        }
        return Ok(null);
    }

    /** Parses the next binary expression.
     * The second boolean return value indicates if something new was parsed.
    */
    @IntoResult()
    BinaryExpression(minPrecedence: number, lhs: Expression): Result<[Expression, boolean], ParserError>
    {
        let token: Token;
        let somethingParsed = false;
        // deno-lint-ignore no-cond-assign
        while (token = this.consume(BinaryOperators) as Token) {
            const currentOp = constructOperator(token);
            const currentOpPrecedence = currentOp.precedence!;
            if (currentOpPrecedence < minPrecedence) {
                break;
            }
            let rhs = this.UnaryPrefixExpression().unwrapOrThrow();
            if (!rhs) {
                // Exists a binary operator, but there's no right-hand side of the expression
                // TODO: Check if the operator is postfix
                // * For now there's no postfix op yet, so we will throw
                throw this.constructError(
                    `Expected an expression right-hand side of binary expression, got \`${this.currentToken}\``,
                    token.span
                );
            }
            somethingParsed = true;
            const nextOpPrecedence = tryConstructOperator(this.currentToken)?.precedence;
            if (nextOpPrecedence)
            {
                if (currentOpPrecedence < nextOpPrecedence) {
                    const [candidate, parsed] = this.BinaryExpression(currentOpPrecedence + 1, rhs).unwrapOrThrow();
                    if (parsed) {
                        rhs = candidate;
                    }
                }
            }
            return Ok([new BinaryExpr(lhs, currentOp, rhs), somethingParsed]);
        }
        return Ok([lhs, somethingParsed]);
    }

    /** Parses the next expression, with some restrictions. */
    ExpressionWithRestrictions(restrictions: Restriction): Result<Nullable<Expression>, ParserError>
    {
        const startPos = this.cursor;
        const expr = this.Expression().unwrapOrThrow();
        if (!expr) {
            this.cursor = startPos;
            return Ok(null);
        }
        // if (restrictions === Restriction.Statement) {
        //     if (!exprCanStandalone(expr)) {
        //         throw this.constructError(
        //             `Expression \`${expr}\` cannot be used as a statement`,
        //             expr.lineSpan[0],
        //             expr.positionSpan[0],
        //             expr.positionSpan[1]
        //         );
        //     }
        // }
        return Ok(expr);
    }

    /* Parses the next expression. */
    @IntoResult()
    Expression(): Result<Nullable<Expression>, ParserError>{
        let lhs = this.UnaryPrefixExpression().unwrapOrThrow();
        if (!lhs) {
            return Ok(null);
        }
        while (true)
        {
            if (this.currentlyIs(TokenKind.LParen)) {
                this.advance();
                lhs = this.ImmediateCallExpression(lhs).unwrapOrThrow();
            }
            if (this.currentlyIs(TokenKind.Semi, TokenKind.Eof)) {
                return Ok(lhs);
            }
            const [expr, somethingParsed] = this.BinaryExpression(0, lhs).unwrapOrThrow();
            if (!somethingParsed) {
                return Ok(expr);
            }
            const nextBinOp = this.currentlyIs(BinaryOperators);
            if (!nextBinOp) {
                return Ok(expr);
            }
            lhs = expr;
        }
    }
}