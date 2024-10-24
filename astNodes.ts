import { Token, TokenKind } from "./token.ts";
import { Nullable } from "./util.ts";
import { Expression, BlockExpr, exprCanStandalone } from './expression.ts';
import { Keywords, tryResolveKeyword } from './keywords.ts';
import { AstNode } from "./astNode.ts";


export class Program extends AstNode {
    constructor(public body: Statement[]) {
        if (!body.length) {
            super([0, 0]);
            return this;
        }
        const firstExpr = body[0];
        const lastExpr = body.at(-1)!;
        super([
            firstExpr.tokenSpan[0],
            lastExpr.tokenSpan[1]
        ]);
    }
}
export class Statement extends AstNode {
    fullString() {
        return `${this.constructor.name} [${this.tokenSpan[0]} -> ${this.tokenSpan[1]})`;
    }
}

export class ExpressionStatement extends Statement {
    constructor(public readonly expr: Expression) {
        super(expr.tokenSpan);
    }
}

export class VariableDeclarationStatement extends Statement {
    constructor(
        public readonly mutable: boolean,
        public readonly ident: Identifier,
        public readonly value: Expression,
        tokenSpan: readonly [number, number]
    ) {
        super(tokenSpan);
    }
}
export class FnDeclarationStatement extends Statement {
    constructor(
        public ident: Identifier,
        public params: Identifier[],
        public body: BlockExpr,
        tokenSpan: readonly [number, number]
    ) {
        super(tokenSpan)
    }
}

export class Identifier extends AstNode {
    /** The keyword that the identifier represents. */
    public readonly keyword: Nullable<Keywords>;
    /** The name of the identifier. */
    public readonly name: string;
    constructor(token: Token) {
        if (token.type !== TokenKind.Ident) {
            throw new Error(`Expected an identifier token, got \`${TokenKind[token.type]}\``);
        }
        super([token.tokenPos, token.tokenPos + 1]);
        this.name = token.content;
        this.keyword = tryResolveKeyword(token.content);
    }
    isKeyword(): this is Keyword {
        return this.keyword !== null;
    }
}

export type Keyword = Identifier & { keyword: Keywords };

/** Whether a statement is allowed in a block. */
export const statementAllowedInBlock = (stmt: Statement) =>
    stmt.isOfKind(VariableDeclarationStatement)
    || stmt.isOfKind(FnDeclarationStatement)
    || (stmt.isOfKind(ExpressionStatement) && exprCanStandalone(stmt.expr));