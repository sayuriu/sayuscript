import type { Program, Identifier } from "./astNodes.ts";
import type {
    BlockExpr,
    BinaryExpr,
    FnCallExpr,
    FnExpr,
    UnaryExpr,
    Literal,
    TupleExpr,
    ImmediateCallExpr,
} from "./expression.ts";
import type { Operator } from "./operators.ts";

import type {
    ExpressionStatement,
    VariableDeclarationStatement,
    FnDeclarationStatement,
    ReturnStatement,
} from "./statements.ts"

/** A visitor for the expression nodes of the abstract syntax tree.
*/
export interface Visitor<VisitResult> {
    /** Visits the program. */
    visitProgram(node: Program): VisitResult;

    /** Visits a variable declaration statement. */
    visitVariableDeclaration(node: VariableDeclarationStatement): VisitResult;

    /** Visits an expression statement. */
    visitExpressionStmt(node: ExpressionStatement): VisitResult;

    /** Visits a function declaration statement. */
    visitFnDeclaration(node: FnDeclarationStatement): VisitResult;

    /** Visits a return statement. */
    visitReturnStmt(node: ReturnStatement): VisitResult;

    /** Visits a block expression. */
    visitBlock(node: BlockExpr): VisitResult;

    /** Visits a binary expression. */
    visitBinary(node: BinaryExpr): VisitResult;

    /** Visits a unary expression. */
    visitUnary(node: UnaryExpr): VisitResult;

    /** Visits a function call expression. */
    visitFnCall(node: FnCallExpr): VisitResult;

    /** Visits an immediate function call expression. */
    visitImmediateFnCall(node: ImmediateCallExpr): VisitResult;

    /** Visits a function expression. */
    visitFn(node: FnExpr): VisitResult;

    /** Visits a literal expression. */
    visitLiteral(node: Literal): VisitResult;

    /** Visits a tuple expression. */
    visitTuple(node: TupleExpr): VisitResult;

    /** Visits an identifier. */
    visitIdentifier(node: Identifier): VisitResult;

    /** Visits an operator. */
    visitOperator(node: Operator): VisitResult;
}
