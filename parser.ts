import { ParserBase as ParserBase, Program, Identifier, Literal } from "./ast.ts";
import { BinaryExpr, Expression, UnaryExpr } from "./expression.ts";
import { UnaryOperators, Operator, resolveOperatorKind, LiteralTypes as LiteralTokens, BinaryOperators, OperatorPrecedence, resolveOperatorMaybe, resolveOperator } from "./operators.ts";
import { Token, TokenKind } from "./token.ts";
import { Keywords } from './keywords.ts';
import { todo } from "./util.ts";
import { ParserError } from './ast.ts';

export class Parser extends ParserBase {
    constructor(protected tokens: Token[]) {
        super();
        this.currentToken = tokens[0];
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

    Statement() {
        const token = this.currentToken;

        if (this.consume(TokenKind.Ident)) {
            // VariableDeclarationStatement
            if (token.value === Keywords.Let) {
                let isMutable = false;
                let ident = this.expect(TokenKind.Ident);
                if (ident.value === Keywords.Var) {
                    isMutable = true;
                    ident = this.expect(TokenKind.Ident);
                }
                this.expect(TokenKind.Eq)
                const expr = this.Expression();
                this.expect(TokenKind.Semi);
                return new (class DeclarationStatement {
                    mutable = isMutable
                    ident = new Identifier(ident.value)
                    value = expr
                })
            }
        }
        return null;
    }

    /** Parses the next unary prefix expression, eg. `-1`. */
    UnaryPrefixExpression(): Expression
    {
        const token = this.currentToken;
        if (this.consume(UnaryOperators)) {
            const expr = this.UnaryPrefixExpression();
            return new UnaryExpr(resolveOperator(token.type), expr);
        }
        return this.PrimaryExpression();
    }

    UnaryPostfixExpression(): Expression
    {
        return todo("UnaryPostfixExpression");
    }

    /** Parses the next primary expression. */
    PrimaryExpression(): Expression
    {
        const token = this.currentToken;
        if (this.consume(TokenKind.Ident, LiteralTokens)) {
            if (token.type === TokenKind.Ident) {
                return new Identifier(token.value!);
            }
            return new Literal(token.type, token.value!);
        }
        else if (this.consume(TokenKind.OpenParen)) {
            const expr = this.Expression();
            this.expect(TokenKind.CloseParen);
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
            const currentOp = resolveOperator(token.type);
            const currentOpPrecedence = currentOp.precedence;
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
                    token.lineSpan[0],
                    token.positionSpan[0],
                    token.positionSpan[1]
                );
            }
            somethingParsed = true;
            const nextOpPrecedence = resolveOperatorMaybe(this.currentToken.type)?.precedence;
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

    /* Parses the next expression. */
    Expression() {
        let lhs = this.UnaryPrefixExpression();
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
// EOF