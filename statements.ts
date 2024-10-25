import { AstNode } from "./astNode.ts";
import type { Identifier } from "./astNodes.ts";
import { type Expression, type BlockExpr, exprCanStandalone } from "./expression.ts";
import type { Visitor } from "./visitor.ts";

export abstract class Statement extends AstNode {}

export class ExpressionStatement extends Statement {
    constructor(public readonly expr: Expression) {
        super(expr.tokenSpan);
    }
    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitExpressionStmt(this);
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
    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitVariableDeclaration(this);
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
    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitFnDeclaration(this);
    }
}

/** Whether a statement is allowed in a block. */
export const statementAllowedInBlock = (stmt: Statement) =>
    stmt.isOfKind(VariableDeclarationStatement)
    || stmt.isOfKind(FnDeclarationStatement)
    || (stmt.isOfKind(ExpressionStatement) && exprCanStandalone(stmt.expr));