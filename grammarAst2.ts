import { ASTParserBase as ParserBase, Program, Identifier, Literal } from "./ast";
import { BinaryExpr, Expression, UnaryExpr } from "./expression";
import { UnaryOperators, Operator, resolveOperator, LiteralTypes as LiteralTokens, BinaryOperators, OperatorPrecedence, resolveOperatorMaybe, Operators } from "./operators";
import { Token, TokenKind } from "./tokens";
import { Keywords } from './keywords';
import { Nullable } from "./util";

export class GrammarParser2 extends ParserBase {
    constructor(protected tokens: Token[]) {
        super();
        this.currentToken = tokens[0];
    }

    override parse() {
        return this.Program();
    }

    Program() {
        let stmt = this.Statement();
        if (!this.eof()) {
            console.error(`Expecting Eof, got token ${this.currentToken}`)
        }
        return new Program([
            stmt
        ]);
    }

    Statement() {
        let token: Token;

        if (token = this.consume(TokenKind.Ident) as Token) {
            // DeclareStatement
            if (token.value === Keywords.Let) {
                const ident = new Identifier(this.expect(TokenKind.Ident).value!);
                this.expect(TokenKind.Eq)
                const expr = this.Expression();
                this.expect(TokenKind.Semi);
                return new (class DeclarationStatement {
                    ident = ident
                    value = expr
                })
            }
        }
    }

    /*  */
    UnaryPrefixExpression(): Expression
    {
        let token: Token;
        if (token = this.consume(UnaryOperators) as Token) {
            let expr = this.UnaryPrefixExpression();
            return new UnaryExpr(Operators[resolveOperator(token.type)], expr);
        }
        return this.PrimaryExpression();
    }

    /* Parses the next primary expression. */
    PrimaryExpression(): Expression
    {
        let token: Token;
        if (token = this.expect(TokenKind.Ident, LiteralTokens) as Token) {
            return this.format(token);
        }
        if (token = this.expect(TokenKind.OpenParen) as Token) {
            let expr = this.Expression();
            this.expect(TokenKind.CloseParen);
            return expr;
        }
        throw new Error(`Unexpected token ${token}`);
    }

    BinaryExpression(minPrecedence: number, lhs: Expression): Expression
    {
        let token: Token;
        while (token = this.consume(BinaryOperators) as Token) {
            const op = resolveOperator(token.type);
            const precedence = OperatorPrecedence(op);
            if (precedence < minPrecedence) {
                break;
            }
            let rhs = this.UnaryPrefixExpression();
            const nextOpPrecedence = OperatorPrecedence(resolveOperatorMaybe(this.currentToken.type));
            if (nextOpPrecedence)
            {
                if (precedence < nextOpPrecedence) {
                    rhs = this.BinaryExpression(precedence + 1, rhs);
                }
            }
            return new BinaryExpr(lhs, Operators[op], rhs);
        }
        return lhs;
    }

    /* Parses the next expression. */
    Expression() {
        const lhs = this.UnaryPrefixExpression();
        return this.BinaryExpression(0, lhs);
    }

    format(node: Token) {
        return node.type === TokenKind.Ident
            ? new Identifier(node.value!)
            : new Literal(node.type, node.value!);
    }
}