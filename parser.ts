import { ASTParserBase as ParserBase, Program, Identifier, Literal } from "./ast";
import { BinaryExpr, Expression, UnaryExpr } from "./expression";
import { UnaryOperators, Operator, resolveOperator, LiteralTypes as LiteralTokens, BinaryOperators, OperatorPrecedence, resolveOperatorMaybe, Operators } from "./operators";
import { Token, TokenKind } from "./tokens";
import { Keywords } from './keywords';
import { Nullable } from "./util";

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
            let stmt = this.Statement();
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
        let token: Token;

        if (token = this.consume(TokenKind.Ident) as Token) {
            // DeclareStatement
            if (token.value === Keywords.Let) {
                const ident = new Identifier(this.expect(TokenKind.Ident).value!);
                this.expect(TokenKind.Eq)
                let expr = this.Expression();
                this.expect(TokenKind.Semi);
                return new (class DeclarationStatement {
                    ident = ident
                    value = expr
                })
            }
        }
        return null;
    }

    /*  */
    UnaryPrefixExpression(): Expression
    {
        let token: Token;
        if (token = this.consume(UnaryOperators) as Token) {
            let expr = this.UnaryPrefixExpression();
            return new UnaryExpr(new Operator(resolveOperator(token.type)), expr);
        }
        return this.PrimaryExpression();
    }

    /* Parses the next primary expression. */
    PrimaryExpression(): Expression
    {
        let token: Token;
        if (token = this.consume(TokenKind.Ident, LiteralTokens) as Token) {
            return this.format(token);
        }
        else if (token = this.consume(TokenKind.OpenParen) as Token) {
            let expr = this.Expression();
            this.expect(TokenKind.CloseParen);
            return expr;
        }
        return null;
    }

    /* Parses the next binary expression. */
    BinaryExpression(minPrecedence: number, lhs: Expression): [Expression, boolean]
    {
        let token: Token;
        let somethingParsed = false;
        while (token = this.consume(BinaryOperators) as Token) {
            const opKind = resolveOperator(token.type);
            const precedence = OperatorPrecedence(opKind);
            if (precedence < minPrecedence) {
                break;
            }
            let rhs = this.UnaryPrefixExpression();
            somethingParsed = true;
            const nextOpPrecedence = OperatorPrecedence(resolveOperatorMaybe(this.currentToken.type));
            if (nextOpPrecedence)
            {
                if (precedence < nextOpPrecedence) {
                    const [candidate, parsed] = this.BinaryExpression(precedence + 1, rhs);
                    if (parsed) {
                        rhs = candidate;
                    }
                }
            }
            return [new BinaryExpr(lhs, new Operator(opKind), rhs), somethingParsed];
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

    format(node: Token) {
        return node.type === TokenKind.Ident
            ? new Identifier(node.value!)
            : new Literal(node.type, node.value!);
    }
}