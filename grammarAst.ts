import { ASTParserBase, Program, Identifier, Literal } from "./ast";
import { BinaryExpr, UnaryExpr } from "./expression";
import { UnaryOperators, Operator, resolveOperator, LiteralTypes, BinaryOperators } from "./operators";
import { Token, TokenKind } from "./tokens";

export class ASTGrammarParser extends ASTParserBase {
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
            if (token.value === 'decl') {
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

    Expression() {
        let token: Token;

        let leftSide: BinaryExpr | UnaryExpr | Identifier | Literal;

        if (token = this.consume(TokenKind.OpenParen) as Token) {
            leftSide = this.Expression();
            this.expect(TokenKind.CloseParen);
        }
        else {
            if (token = this.consume(UnaryOperators) as Token) {
                if (this.consume(TokenKind.OpenParen)) {
                    let expr = this.Expression();
                    this.expect(TokenKind.CloseParen);
                    leftSide = new UnaryExpr(new Operator(resolveOperator(token.type)), this.format(expr));
                }
                let expr = this.expect(LiteralTypes, TokenKind.Ident);
                leftSide = new UnaryExpr(new Operator(resolveOperator(token.type)), this.format(expr));
            }
            else {
                leftSide = this.expect(LiteralTypes, TokenKind.Ident);
            }
        }
        if (leftSide instanceof Token){
            leftSide = leftSide.type === TokenKind.Ident
                ? new Identifier(leftSide.value!)
                : new Literal(leftSide.type, leftSide.value!);
        }

        if (token = this.consume(BinaryOperators) as Token) {
            let right = this.Expression();
            return new BinaryExpr(leftSide, new Operator(resolveOperator(token.type)), right);
        }

        return leftSide;
    }

    format(node: Token) {
        return node.type === TokenKind.Ident
            ? new Identifier(node.value!)
            : new Literal(node.type, node.value!);
    }
}
