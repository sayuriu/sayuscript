import { AstNode } from "./astNode.ts";
import type { Identifier } from "./astNodes.ts";
import { type Expression, type BlockExpr, exprCanStandalone } from "./expression.ts";
import type { TokenSpan } from "./util.ts";
import type { Visitor } from "./visitor.ts";

export abstract class Statement extends AstNode {}

export class ReturnStatement extends Statement {
    constructor(public readonly expr: Expression) {
        super(expr.tokenSpan);
    }
    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitReturnStmt(this);
    }
}

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
        tokenSpan: TokenSpan
    ) {
        super(tokenSpan);
    }
    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitVariableDeclaration(this);
    }
}

export enum FnKind {
    /** A function that performs an action (always returns `Nothing`). */
    Action,
    /** A function that returns a value. It can also return `Nothing`. */
    Compute
}

export class FnDeclarationStatement extends Statement {
    constructor(
        public ident: Identifier,
        public params: Identifier[],
        public body: BlockExpr,
        tokenSpan: TokenSpan,
        public kind: FnKind = FnKind.Action
    ) {
        super(tokenSpan)
    }
    override accept<T>(visitor: Visitor<T>): T {
        return visitor.visitFnDeclaration(this);
    }
}

/** Determines whether a statement is allowed in a block. */
export const statementAllowedInBlock = (stmt: Statement) =>
    stmt.isOfKind(VariableDeclarationStatement)
    || stmt.isOfKind(FnDeclarationStatement)
    || stmt.isOfKind(ReturnStatement)
    || (stmt.isOfKind(ExpressionStatement) && exprCanStandalone(stmt.expr));